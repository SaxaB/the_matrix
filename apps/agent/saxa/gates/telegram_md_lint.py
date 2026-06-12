#!/usr/bin/env python3
r"""
telegram_md_lint.py - Validate Telegram MarkdownV2 payloads before sending.

Motivation: 2026-05-22 a briefing reply failed twice with the opaque error
"Can't find end of Bold entity at byte offset 2010" because of a single
unescaped `~` inside `*Mercado \(~4h sesion US\)*`. The reported offset is
where the parser gives up, not where the bad char is. This linter catches
common escape mistakes before the network call so the agent does not waste
turns bisecting Telegram error messages.

Coverage (after Codex review 2026-05-22):
- Reserved chars unescaped outside code zones: `_ * [ ] ( ) ~ \` > # + - = | { } . !`
- Reserved chars unescaped inside code blocks and code spans: `\`` and `\\`
- Unterminated fenced code blocks (```...``` without close)
- Unterminated inline code spans (`...` without close)
- Stack-based emphasis tracking: detects crossed nesting like `*a _b* c_`,
  underline delimiters `__...__`, unclosed emphasis at end of segment.
- Conservative reporting for link syntax `[txt](url)` (flags the chars).

Out of scope: spoilers `||...||`, custom emoji, full URL parsing inside
`(...)` of legitimate links.

Usage:
    python telegram_md_lint.py <file>          # lint a file
    python telegram_md_lint.py -               # lint stdin
    python telegram_md_lint.py --text "..."    # lint inline text
    python telegram_md_lint.py --self-test     # run built-in cases

Exit codes: 0 clean, 1 issues found, 2 invocation error.

Programmatic API:
    from telegram_md_lint import lint, Issue
    issues = lint(text)  # -> list[Issue]
"""
from __future__ import annotations

import io
import sys
from dataclasses import dataclass
from typing import Iterator

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, io.UnsupportedOperation):
        pass

# MarkdownV2 reserved characters per Telegram Bot API spec:
# https://core.telegram.org/bots/api#markdownv2-style
RESERVED = set("_*[]()~`>#+-=|{}.!")
EMPHASIS = {"*", "_"}
LITERAL_REQUIRES_ESCAPE = RESERVED - EMPHASIS - {"`"}  # backtick handled by segment split


@dataclass(frozen=True)
class Issue:
    line: int        # 1-based
    col: int         # 1-based, char column (not byte)
    char: str
    reason: str
    snippet: str

    def format(self) -> str:
        return f"  L{self.line}:C{self.col} '{self.char}' — {self.reason} | {self.snippet!r}"


# ---------- segmentation ----------

def _iter_segments(text: str) -> Iterator[tuple[str, str, int]]:
    """Split text into segments. Yields tuples of (kind, content, start_index).
    kinds:
      - 'text': regular text, must be validated for escaping
      - 'code': fenced code block including the ``` fences (validate inner ` and \\)
      - 'span': inline code span including the ` delimiters (same)
      - 'code_unclosed': fenced block without closing fence (report as Issue)
      - 'span_unclosed': inline span without closing backtick on same line

    start_index is the position in the ORIGINAL text where this segment starts.
    Caller uses it for accurate line/col reporting.
    """
    i = 0
    n = len(text)
    buf_start = 0
    buf_len = 0

    def flush():
        nonlocal buf_start, buf_len
        if buf_len:
            yield_seg = ("text", text[buf_start:buf_start + buf_len], buf_start)
            buf_len = 0
            return yield_seg
        return None

    while i < n:
        # Fenced code block (```), must be at start of line
        if text.startswith("```", i) and (i == 0 or text[i - 1] == "\n"):
            seg = flush()
            if seg:
                yield seg
            end = text.find("\n```", i + 3)
            if end == -1:
                # unterminated fenced block
                yield ("code_unclosed", text[i:], i)
                i = n
                continue
            code_end = end + 4
            yield ("code", text[i:code_end], i)
            i = code_end
            buf_start = i
            continue

        c = text[i]

        # Inline code span on same line: ` ... `
        # Inside a span, `\`` is the escape for a literal backtick (Telegram rule),
        # so the closer is the first UNESCAPED backtick on the same line.
        if c == "`":
            j = i + 1
            closed = False
            while j < n and text[j] != "\n":
                if text[j] == "\\" and j + 1 < n:
                    j += 2  # skip escape pair
                    continue
                if text[j] == "`":
                    closed = True
                    break
                j += 1
            if closed:
                seg = flush()
                if seg:
                    yield seg
                yield ("span", text[i:j + 1], i)
                i = j + 1
                buf_start = i
                continue
            # unterminated span: report and fall through to text scan
            yield ("span_unclosed", text[i:min(n, i + 40)], i)
            # Treat the lone backtick as text so subsequent scanning continues
            if buf_len == 0:
                buf_start = i
            buf_len += 1
            i += 1
            continue

        if buf_len == 0:
            buf_start = i
        buf_len += 1
        i += 1

    seg = flush()
    if seg:
        yield seg


# ---------- line/col helpers ----------

def _line_col_of(text: str, idx: int) -> tuple[int, int]:
    """Return 1-based (line, col) for char index idx in text."""
    line = 1
    col = 1
    for i, ch in enumerate(text):
        if i == idx:
            return line, col
        if ch == "\n":
            line += 1
            col = 1
        else:
            col += 1
    return line, col


def _snippet(text: str, idx: int, radius: int = 25) -> str:
    start = max(0, idx - radius)
    end = min(len(text), idx + radius + 1)
    return text[start:end].replace("\n", "\\n")


# ---------- scanners ----------

def _scan_code_content(text: str, content_start: int, content_end: int) -> list[Issue]:
    """Scan the inside of a code block or code span (without fences/delimiters)
    for unescaped ` and \\. Telegram MarkdownV2 spec requires both to be
    backslash-escaped inside pre/code entities.
    """
    issues: list[Issue] = []
    i = content_start
    while i < content_end:
        ch = text[i]
        if ch == "\\":
            if i + 1 < content_end:
                # consume escape pair (\\ or \`)
                nxt = text[i + 1]
                if nxt in ("\\", "`"):
                    i += 2
                    continue
                # Telegram: inside pre/code, ONLY \ and ` can be escaped.
                # A backslash followed by anything else is bad: the backslash
                # itself is not escaped.
                line, col = _line_col_of(text, i)
                issues.append(Issue(
                    line=line, col=col, char="\\",
                    reason=f"'\\' inside code must be escape pair '\\\\' or '\\`', got '\\{nxt}'",
                    snippet=_snippet(text, i),
                ))
                i += 1
                continue
            # trailing \ at end of code content
            line, col = _line_col_of(text, i)
            issues.append(Issue(
                line=line, col=col, char="\\",
                reason="trailing '\\' inside code; escape as '\\\\'",
                snippet=_snippet(text, i),
            ))
            i += 1
            continue
        if ch == "`":
            line, col = _line_col_of(text, i)
            issues.append(Issue(
                line=line, col=col, char="`",
                reason="unescaped '`' inside code/pre; escape as '\\`'",
                snippet=_snippet(text, i),
            ))
        i += 1
    return issues


def _reason_for(ch: str) -> str:
    if ch == "~":
        return "'~' opens strikethrough in MarkdownV2; escape as '\\~'"
    if ch == "=":
        return "'=' is reserved in MarkdownV2; escape as '\\='"
    if ch in "{}":
        return f"'{ch}' is reserved in MarkdownV2; escape as '\\{ch}'"
    if ch == "|":
        return "'|' delimits spoilers in MarkdownV2; escape as '\\|'"
    return f"'{ch}' is reserved in MarkdownV2; escape as '\\{ch}'"


def _scan_text_segment(text: str, seg_start: int, seg_end: int) -> list[Issue]:
    """Scan a text segment for reserved-char escape issues and emphasis
    balance/nesting using a stack. Reports Issue objects with original-text
    coordinates.
    """
    issues: list[Issue] = []
    # Stack of (delim, original_index). delim is "*", "_" or "__".
    stack: list[tuple[str, int]] = []
    i = seg_start
    while i < seg_end:
        ch = text[i]

        if ch == "\\":
            # Escape pair; consume both chars regardless of what follows.
            i += 2
            continue

        # Underline delimiter is `__` (two consecutive unescaped underscores).
        if ch == "_" and i + 1 < seg_end and text[i + 1] == "_":
            if stack and stack[-1][0] == "__":
                stack.pop()
            elif any(d == "__" for d, _ in stack):
                # crossed: closing __ but it is not on top
                line, col = _line_col_of(text, i)
                issues.append(Issue(
                    line=line, col=col, char="__",
                    reason="crossed underline delimiter; entities must nest, not overlap",
                    snippet=_snippet(text, i),
                ))
                # pop the matching __ wherever it is, to recover
                for k in range(len(stack) - 1, -1, -1):
                    if stack[k][0] == "__":
                        del stack[k]
                        break
            else:
                stack.append(("__", i))
            i += 2
            continue

        if ch in EMPHASIS:
            if stack and stack[-1][0] == ch:
                stack.pop()
            elif any(d == ch for d, _ in stack):
                # crossed
                line, col = _line_col_of(text, i)
                issues.append(Issue(
                    line=line, col=col, char=ch,
                    reason=f"crossed '{ch}' delimiter; emphasis entities must nest, not overlap",
                    snippet=_snippet(text, i),
                ))
                for k in range(len(stack) - 1, -1, -1):
                    if stack[k][0] == ch:
                        del stack[k]
                        break
            else:
                stack.append((ch, i))
            i += 1
            continue

        if ch in LITERAL_REQUIRES_ESCAPE:
            line, col = _line_col_of(text, i)
            issues.append(Issue(
                line=line, col=col, char=ch,
                reason=_reason_for(ch),
                snippet=_snippet(text, i),
            ))
        i += 1

    # Unclosed emphasis at end of segment.
    for delim, pos in stack:
        line, col = _line_col_of(text, pos)
        issues.append(Issue(
            line=line, col=col, char=delim,
            reason=f"unclosed '{delim}' emphasis delimiter; entity will not close",
            snippet=_snippet(text, pos),
        ))
    return issues


# ---------- top-level lint ----------

def lint(text: str) -> list[Issue]:
    """Return Issues describing escape and structure problems for MarkdownV2.

    Empty list means the linter found no problems within its declared scope.
    A clean payload still may fail Telegram parsing on edge cases the linter
    does not model (link URL parsing, custom emoji, exotic delimiter runs).
    Treat 'clean' as 'no known-bad pattern detected', not as 'guaranteed
    parseable'.
    """
    issues: list[Issue] = []

    for kind, content, start in _iter_segments(text):
        if kind == "text":
            issues.extend(_scan_text_segment(text, start, start + len(content)))
        elif kind == "code":
            # content includes fences. Inner content is between the opening
            # ``` (and optional language tag + newline) and the closing \n```.
            # We scan everything between the first newline after opening fence
            # and the position of the closing fence.
            inner_start = content.find("\n", 3)
            inner_start = start + inner_start + 1 if inner_start != -1 else start + 3
            inner_end = start + len(content) - 4  # before '\n```'
            if inner_end < inner_start:
                inner_end = inner_start
            issues.extend(_scan_code_content(text, inner_start, inner_end))
        elif kind == "span":
            # content is `...`; inner is between the two backticks
            inner_start = start + 1
            inner_end = start + len(content) - 1
            issues.extend(_scan_code_content(text, inner_start, inner_end))
        elif kind == "code_unclosed":
            line, col = _line_col_of(text, start)
            issues.append(Issue(
                line=line, col=col, char="```",
                reason="unterminated fenced code block; missing closing '```' on its own line",
                snippet=_snippet(text, start),
            ))
        elif kind == "span_unclosed":
            line, col = _line_col_of(text, start)
            issues.append(Issue(
                line=line, col=col, char="`",
                reason="unterminated inline code span; missing closing '`' on same line",
                snippet=_snippet(text, start),
            ))

    return issues


# ---------- self tests ----------

SELF_TESTS: list[tuple[str, str, bool]] = [
    # (label, payload, expect_clean)
    ("safe bold", "*hello world*", True),
    ("safe italic", "_hello world_", True),
    ("safe code block", "```\nfoo bar\n```", True),
    ("safe code span", "use `pip` here", True),
    ("escaped dot", "Hello\\.", True),
    # original bug
    ("tilde inside bold (real bug)", "*Mercado \\(~4h sesion US\\)*", False),
    ("tilde isolated minimal", "*x ~y z*", False),
    ("equal sign unescaped", "*P=Q*", False),
    ("pipe unescaped", "a|b", False),
    ("brace unescaped", "set {x}", False),
    ("dot unescaped outside bold", "Hello world.", False),
    ("plus unescaped", "+1,5%", False),
    ("special chars inside code block", "```\nES=F +0,67 ~ x.y!\n```", True),
    ("special chars inside code span", "use `a=b+c.d!` literally", True),
    ("multi-section ok",
     "*Hdr*\n```\nSPX +0,69\n```\n\n*Hdr2*\n```\ndata\n```", True),
    ("odd asterisk", "abc *def ghi", False),
    ("link-like is flagged", "[txt](http://x)", False),
    # Codex review additions (2026-05-22):
    ("unterminated fenced block", "```\nP=Q", False),
    ("backslash inside code block (bad)", "```\nC:\\Temp\n```", False),
    ("escaped backtick inside span", "use `a\\`b` literally", True),
    ("crossed emphasis * _ * _", "*a _b* c_", False),
    ("unterminated underline __", "__underline", False),
    ("escape parity bad (\\\\.)", "\\\\.", False),
    ("escape parity good (\\\\\\.)", "\\\\\\.", True),
    ("backslash inside code, escaped correctly", "```\nC:\\\\Temp\n```", True),
    ("literal backtick inside code, escaped", "```\nuse \\`code\\`\n```", True),
    ("nested ok bold > italic", "*outer _inner_ outer*", True),
]


def run_self_test() -> int:
    failed = 0
    for label, payload, expect_clean in SELF_TESTS:
        issues = lint(payload)
        clean = len(issues) == 0
        if clean == expect_clean:
            print(f"  OK   {label}")
        else:
            failed += 1
            print(f"  FAIL {label}")
            print(f"       expected_clean={expect_clean} got_clean={clean}")
            for it in issues:
                print(f"       {it.format()}")
            print(f"       payload: {payload!r}")
    print(f"\n{len(SELF_TESTS) - failed}/{len(SELF_TESTS)} self-tests passed.")
    return 0 if failed == 0 else 1


# ---------- CLI ----------

if __name__ == "__main__":
    raise SystemExit(main())

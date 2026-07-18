from backend.models.chunk import Chunk
from backend.parser.text_parser import TextParser


def test_code_is_split_with_overlap_and_line_numbers():
    content = "\n".join(f"line {number}" for number in range(1, 11))
    parser = TextParser(chunk_size=4, overlap=1)

    chunks = parser.parse_files(
        "demo",
        [{"file_path": "src/main.py", "content": content}],
    )

    assert len(chunks) == 3
    assert chunks[0].start_line == 1
    assert chunks[0].end_line == 4
    assert chunks[1].start_line == 4
    assert chunks[1].content.splitlines()[0] == "line 4"
    assert all(isinstance(chunk, Chunk) for chunk in chunks)


def test_markdown_is_split_by_headings():
    parser = TextParser(chunk_size=20)
    chunks = parser.parse_files(
        "demo",
        [
            {
                "file_path": "README.md",
                "content": "# Intro\ntext\n## Install\npip install app\n## Usage\nrun app",
            }
        ],
    )

    assert len(chunks) == 3
    assert chunks[0].content.startswith("# Intro")
    assert chunks[1].content.startswith("## Install")
    assert chunks[2].start_line == 5


def test_empty_files_are_skipped_and_paths_are_normalized():
    parser = TextParser()
    chunks = parser.parse_files(
        "demo",
        [
            {"file_path": "empty.py", "content": "   \n"},
            {"file_path": "src\\app.py", "content": "print('ok')"},
        ],
    )

    assert len(chunks) == 1
    assert chunks[0].file_path == "src/app.py"


def test_invalid_parser_settings_are_rejected():
    try:
        TextParser(chunk_size=5, overlap=5)
    except ValueError as error:
        assert "overlap" in str(error)
    else:
        raise AssertionError("invalid overlap should raise ValueError")

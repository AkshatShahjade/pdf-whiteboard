# Navigation
# app/domain/parsing.py

def parse_question_groups(raw_text: str) -> list[list[str]]:
    group_blocks = [
        block.strip()
        for block in raw_text.strip().split("\n\n")
        if block.strip()
    ]

    groups: list[list[str]] = []

    for block in group_blocks:
        questions = [
            line.strip()
            for line in block.splitlines()
            if line.strip()
        ]

        if questions:
            groups.append(questions)

    return groups
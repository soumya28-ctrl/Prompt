import re


def analyze_instructions(prompt):
    instructions = re.findall(r"\b(please|must|should|ensure|provide|analyze|compare|evaluate|recommend|summarize|explain)\b", prompt.lower())
    return {
        "instruction_count": len(instructions),
        "instructions": instructions,
    }

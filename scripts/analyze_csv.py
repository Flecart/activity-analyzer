#!/usr/bin/env python3
import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path


def read_csv_rows(csv_path: Path):
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield row


def normalize_field(value: str) -> str:
    if value is None:
        return ""
    return value.strip()


def analyze(csv_path: Path):
    activity_counter: Counter[str] = Counter()
    category_counter: Counter[str] = Counter()
    tag_counter: Counter[str] = Counter()

    # Track co-occurrences to help future rules
    activity_to_categories: defaultdict[str, Counter[str]] = defaultdict(Counter)

    for row in read_csv_rows(csv_path):
        activity = normalize_field(row.get("activity name", ""))
        categories = normalize_field(row.get("categories", ""))
        record_tags = normalize_field(row.get("record tags", ""))

        if activity:
            activity_counter[activity] += 1

        # categories may be comma-separated or a single token
        if categories:
            for c in [c.strip() for c in categories.split(",") if c.strip()]:
                category_counter[c] += 1
                if activity:
                    activity_to_categories[activity][c] += 1

        if record_tags:
            for t in [t.strip() for t in record_tags.split(",") if t.strip()]:
                tag_counter[t] += 1

    return {
        "activities": activity_counter,
        "categories": category_counter,
        "tags": tag_counter,
        "activity_to_categories": activity_to_categories,
    }


def suggest_mapping(analysis: dict) -> dict:
    # Start with a baseline mapping. These can be refined in the app later.
    # User requested: map 'esplorazioni' to Work.
    activity_to_coarse = {
        # Core
        "Sleep": "Sleep",
        "Cooking": "Chores",
        "Cure": "Chores",
        "svago": "Leisure",
        "pause": "Leisure",
        "People": "Leisure",

        # Work and courses
        "PAI": "Work",
        "AML": "Work",
        "esplorazioni": "Work",
        "chores": "Work",  # admin work per user note
        "Sides": "Work",
        "Marro": "Work",
        "Zhijing": "Work",
        "NLP": "Work",
        "DJ": "Work",
        "Moor": "Work",

        # Courses counted as Work
        "Big Data": "Work",
        "Neural Sytems": "Work",
        "Robots": "Work",
        "Cloud": "Work",
        "ASL": "Work",
        "perception": "Work",
        "finance": "Work",
        "Large": "Work",
        "Psycho": "Work",
        "Object": "Work",
        "Algolab": "Leisure",

        # Home chores
        "Casa": "Chores",

        # Health/fitness — mapped to Chores to keep coarse set small
        "Exercise": "Chores",

        # Context-dependent; default will be Leisure but handled specially in app
        "realpausa": "Leisure",
    }

    # Heuristics: if a category token equals 'course', likely Work
    category_to_coarse = {
        "course": "Work",
        "work": "Work",
        "svago": "Leisure",
        "studio": "Work",
        "Religion": "Chores",
    }

    # Include all seen activities and categories with unknown -> "Uncategorized"
    for activity in analysis["activities"].keys():
        activity_to_coarse.setdefault(activity, "Uncategorized")

    for category in analysis["categories"].keys():
        category_to_coarse.setdefault(category, "Uncategorized")

    return {
        "coarse_types": ["Sleep", "Work", "Chores", "Leisure", "Uncategorized"],
        "activity_to_coarse": activity_to_coarse,
        "category_to_coarse": category_to_coarse,
        "special_rules": {
            # In dashboard aggregation, if an entry has activity 'realpausa' and is between two
            # consecutive Work-classified entries, inherit the preceding entry's coarse class.
            # Otherwise fall back to its default mapping (Leisure).
            "realpausa_inherit_between_work": True
        }
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: analyze_csv.py <path-to-csv> [output-dir]", file=sys.stderr)
        sys.exit(1)

    csv_path = Path(sys.argv[1]).expanduser().resolve()
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}", file=sys.stderr)
        sys.exit(2)

    output_dir = Path(sys.argv[2]).expanduser().resolve() if len(sys.argv) > 2 else csv_path.parent
    output_dir.mkdir(parents=True, exist_ok=True)

    analysis = analyze(csv_path)

    # Print summary to stdout
    print("Top activities:")
    for name, count in analysis["activities"].most_common(20):
        print(f"  {name}: {count}")

    print("\nTop categories:")
    for name, count in analysis["categories"].most_common(20):
        print(f"  {name}: {count}")

    print("\nTop record tags:")
    for name, count in analysis["tags"].most_common(20):
        print(f"  {name}: {count}")

    mapping = suggest_mapping(analysis)

    mapping_path = output_dir / "category_mapping.generated.json"
    with mapping_path.open("w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

    print(f"\nSuggested mapping written to: {mapping_path}")


if __name__ == "__main__":
    main()



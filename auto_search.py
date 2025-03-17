import os
import re
from pathlib import Path
from typing import List, Set
from dataclasses import dataclass


# Data class to store search results
@dataclass
class SearchResult:
    file_path: str
    line_number: int
    line_content: str
    matched_word: str


class AutoFileSearcher:
    def __init__(self):
        """Initialize the search parameters from user input."""

        # Get root directory from user
        self.root_dir = input("Enter the directory to search in: ").strip()

        # Get search words from user (comma-separated)
        user_words = input("Enter words to search for (comma-separated): ").strip()
        self.search_words = [word.strip() for word in user_words.split(",")]

        # Get file extensions from user (space-separated)
        user_extensions = input("Enter file extensions to search in (space-separated, e.g., .py .js .txt): ").strip()
        self.file_extensions = {ext.strip().lower() for ext in user_extensions.split()}

        # Get folders to exclude from user (comma-separated)
        user_exclude_folders = input("Enter folders to exclude (comma-separated, leave empty for none): ").strip()
        self.exclude_folders = {folder.strip().lower() for folder in
                                user_exclude_folders.split(",")} if user_exclude_folders else set()

        # Ask if whole word matching is required
        whole_word_input = input("Match whole words only? (yes/no): ").strip().lower()
        self.whole_word = whole_word_input in ("yes", "y")

        # Run the search automatically
        self.run_search()

    def should_skip_folder(self, folder_name: str) -> bool:
        """Check if a folder should be skipped based on user-defined exclusions."""
        return folder_name.lower() in self.exclude_folders

    def run_search(self):
        """Run the search and display results."""
        print(f"\nSearching in directory: {self.root_dir}")
        print(f"Looking for words: {', '.join(self.search_words)}")
        print(f"In file types: {', '.join(self.file_extensions)}")
        print(f"Excluding folders: {', '.join(self.exclude_folders) if self.exclude_folders else 'None'}")
        print(f"Whole word matching: {'Yes' if self.whole_word else 'No'}")
        print("\nResults:")
        print("-" * 50)

        results = self.search_files()
        self.print_results(results)

    def search_files(self) -> List[SearchResult]:
        """Search for specified words in all matching files."""
        results = []

        # Compile regex patterns for search words
        patterns = {
            word: re.compile(rf'\b{re.escape(word)}\b' if self.whole_word else re.escape(word), re.IGNORECASE)
            for word in self.search_words
        }

        # Walk through directories and search in files
        for root, dirs, files in os.walk(self.root_dir):
            # Remove excluded folders from search
            dirs[:] = [d for d in dirs if not self.should_skip_folder(d)]

            for file in files:
                file_path = Path(root) / file

                # Check if the file has one of the user-specified extensions
                if file_path.suffix.lower() in self.file_extensions:
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            # Read file line by line
                            for line_num, line in enumerate(f, 1):
                                for word, pattern in patterns.items():
                                    if pattern.search(line):  # Check if pattern is found in the line
                                        results.append(SearchResult(
                                            file_path=str(file_path),
                                            line_number=line_num,
                                            line_content=line.strip(),
                                            matched_word=word
                                        ))
                    except Exception as e:
                        print(f"Error reading {file_path}: {e}")

        return results

    def print_results(self, results: List[SearchResult]):
        """Display search results in a formatted way."""
        if not results:
            print("No matches found!")
            print("\nPossible reasons:")
            print("- The search words might not exist in any files.")
            print("- The files might have different extensions than what was specified.")
            print("- The files might be in a different directory.")
            print("- The files might be inside excluded folders.")
            print("\nCurrent settings:")
            print(f"- Search directory: {self.root_dir}")
            print(f"- File types being searched: {', '.join(self.file_extensions)}")
            print(f"- Words being searched: {', '.join(self.search_words)}")
            print(f"- Excluded folders: {', '.join(self.exclude_folders) if self.exclude_folders else 'None'}")
            print(f"- Whole word matching: {'Yes' if self.whole_word else 'No'}")
        else:
            print(f"Found {len(results)} matches:")
            current_file = None

            for result in results:
                # Print file header only when we move to a new file
                if current_file != result.file_path:
                    current_file = result.file_path
                    print(f"\nFile: {result.file_path}")

                print(f"Line {result.line_number}: {result.line_content}")
                print(f"Matched word: {result.matched_word}")
                print("-" * 50)


# Run the script when executed
if __name__ == "__main__":
    AutoFileSearcher()

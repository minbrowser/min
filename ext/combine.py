import os
from pathlib import Path

def combine_text_files(input_dir, output_file):
    """
    Combines all text files in the specified directory into a single output file.
    
    Args:
        input_dir (str): Path to the directory containing text files
        output_file (str): Path where the combined file will be saved
    """
    # Create Path objects
    input_path = Path(input_dir)
    output_path = Path(output_file)
    
    # Get all .txt files in the directory
    text_files = list(input_path.glob('*.txt'))
    
    if not text_files:
        print(f"No text files found in {input_dir}")
        return
    
    # Open output file in write mode
    with open(output_path, 'w', encoding='utf-8') as outfile:
        # Iterate through each text file
        for i, file_path in enumerate(text_files, 1):
            try:
                # Read and write content with a separator
                with open(file_path, 'r', encoding='utf-8') as infile:
                    outfile.write(f"\n{'='*50}\n")
                    outfile.write(f"Content from file: {file_path.name}\n")
                    outfile.write(f"{'='*50}\n\n")
                    outfile.write(infile.read())
                    outfile.write('\n')
                print(f"Processed file {i}: {file_path.name}")
            except Exception as e:
                print(f"Error processing {file_path.name}: {str(e)}")
    
    print(f"\nCombined {len(text_files)} files into {output_file}")

# Example usage
if __name__ == "__main__":
    # Replace these paths with your actual directory and desired output file
    input_directory = "./filterLists"
    output_file = "./filters.txt"
    
    combine_text_files(input_directory, output_file)
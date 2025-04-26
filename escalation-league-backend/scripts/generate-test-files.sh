#!/bin/bash

# Define the directories to scan and the base test directory
BASE_DIRS=("controllers" "middlewares" "models" "routes")
TESTS_DIR="./tests"

# Create the base tests directory if it doesn't exist
mkdir -p "$TESTS_DIR"

# Loop through each base directory
for BASE_DIR in "${BASE_DIRS[@]}"; do
    # Find all .js files in the current base directory
    find "$BASE_DIR" -type f -name "*.js" | while read -r file; do
        # Get the relative path and test file path
        relative_path="${file#$BASE_DIR/}"
        test_file="$TESTS_DIR/$BASE_DIR/${relative_path%.js}.test.js"

        # Create the test file directory if it doesn't exist
        mkdir -p "$(dirname "$test_file")"

        # Check if the test file already exists
        if [ ! -f "$test_file" ]; then
            # Create a new test file with a basic template
            echo "Creating test file: $test_file"
            cat <<EOL > "$test_file"
// filepath: $test_file
// TODO: Implement tests for $file

describe('${relative_path%.js}', () => {
    it('should have tests implemented', () => {
        expect(true).toBe(true); // Placeholder test
    });
});
EOL
        else
            echo "Test file already exists: $test_file"
        fi
    done
done

echo "Test file generation complete."
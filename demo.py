# ==============================================================================
# PyAssist-AI Demo File
# ==============================================================================
# This file is designed to test the features of the PyAssist-AI extension.
# Follow the instructions in the comments below.

# ------------------------------------------------------------------------------
# 1. Error Detection (Command: PyAssist: Scan for Errors)
# ------------------------------------------------------------------------------
# There are intentional logical and syntax errors below.
# Run 'PyAssist: Scan for Errors' to see diagnostics (squiggles).

def calculate_average(numbers):
    total = 0
    # Error: iterating over range of len but sending index to sum? No, just logic error.
    # Let's make a syntax error or runtime risk.
    for i in range(len(numbers) + 1):  # IndexError risk
        total += numbers[i]
    return total / 0  # ZeroDivisionError

# ------------------------------------------------------------------------------
# 2. Code Recommendation (Command: PyAssist: Improve Code)
# ------------------------------------------------------------------------------
# Select the function below and run 'PyAssist: Improve Code'.
# It should suggest a cleaner, more pythonic way (e.g., list comprehension).

def get_even_numbers(nums):
    evens = []
    for n in nums:
        if n % 2 == 0:
            evens.append(n)
    return evens

# ------------------------------------------------------------------------------
# 3. Code Generation (Command: PyAssist: Generate Code from Comment)
# ------------------------------------------------------------------------------
# Place your cursor on the comment below and run 'PyAssist: Generate Code from Comment'.

# Function to fetch weather data from an API given a city name

# ------------------------------------------------------------------------------
# 4. Chatbot (Sidebar: PyAssist AI)
# ------------------------------------------------------------------------------
# Open the "PyAssist AI" sidebar (click the robot icon in the activity bar).
# Ask: "Explain the bug in calculate_average function."

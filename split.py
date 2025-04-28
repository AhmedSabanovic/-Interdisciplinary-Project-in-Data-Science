import pandas as pd

def split_csv(file_path, output_prefix):
    # Read the CSV file
    data = pd.read_csv(file_path)
    
    # Keep only HH:MM:SS in the time column
    data["time"] = data["time"].apply(
        lambda x: x.split(" ")[1].split(".")[0] if isinstance(x, str) and " " in x else x
    )

    # Get all unique gpi_ascat values
    unique_gpi = data["gpi_ascat"].unique()
    total_gpi = len(unique_gpi)

    # Determine how many unique gpi_ascat per split
    gpi_per_split = total_gpi // 1
    remainder = total_gpi % 1

    start = 0
    for i in range(1):
        # Calculate the end index for the current group of gpi_ascat
        end = start + gpi_per_split + (1 if i < remainder else 0)

        # Slice the unique gpi_ascat values for this split
        gpi_subset = unique_gpi[start:end]

        # Filter data for these gpi_ascat values
        split_data = data[data["gpi_ascat"].isin(gpi_subset)]

        # Write to CSV
        split_data.to_csv(f"{output_prefix}_part{i+1}.csv", index=False)

        # Move the start pointer
        start = end

# Example usage
file_path = r"C:\Users\ahmed\Desktop\GEO Test\ascat_merged_roll15.csv"
output_prefix = r"C:\Users\ahmed\Desktop\GEO Test\ascat_merged_roll15"
split_csv(file_path, output_prefix)
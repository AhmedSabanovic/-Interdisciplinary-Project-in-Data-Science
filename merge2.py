import pandas as pd

# Load the datasets
ascat_soil_categories_path = r"ascat_soil_categories.csv"
aggregated_merged_path = r"cell1248_predictions_baseline.csv"

ascat_soil_categories = pd.read_csv(ascat_soil_categories_path)
aggregated_merged = pd.read_csv(aggregated_merged_path)

# Remove 'soil_cat' from aggregated_merged if it exists
if 'soil_cat' in aggregated_merged.columns:
    aggregated_merged = aggregated_merged.drop(columns=['soil_cat'])

# Merge the datasets on the 'gpi_ascat' column
merged_data = pd.merge(ascat_soil_categories, aggregated_merged, on="gpi_ascat", how="inner")

# Save the merged dataset to a new CSV file
output_path = r"ascat_merged_baseline.csv"
merged_data.to_csv(output_path, index=False)

print(f"Merged data saved to {output_path}")

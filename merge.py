import pandas as pd

# Load the CSV files
file1 = ascat_soil_categories.csv'
file2 = 'filtered_merged_diff_diff_files.csv'

df1 = pd.read_csv(file1)
df2 = pd.read_csv(file2)

# Drop specified columns from ascat_soil_categories1
columns_to_drop = ['params', 'theta_turn', 'sigma_dry']
df1 = df1.drop(columns=columns_to_drop, errors='ignore')

# Ensure 'soil_cat' is only taken from file1
if 'soil_cat' in df2.columns:
    df2 = df2.drop(columns=['soil_cat'])

# Merge the dataframes on the 'gpi_ascat' column
merged_df = pd.merge(df1, df2, on='gpi_ascat', how='inner')

# Check if target and prediction values are equal and calculate percentage match
if 'target' in df2.columns and 'prediction' in df2.columns:
    merged_df['percentage_match'] = (merged_df['target'] == merged_df['prediction']).astype(int) * 100

# Group by 'gpi_ascat' and calculate the mean percentage match, keeping lon, lat, and soil_cat
grouped_df = merged_df.groupby('gpi_ascat', as_index=False).agg({
    'percentage_match': 'mean',
    'lon': 'first',  
    'lat': 'first',  
    'soil_cat': 'first'  
})

# Rename 'Unnamed: 0' to 'time' (if it exists in the grouped DataFrame)
if 'Unnamed: 0' in grouped_df.columns:
    grouped_df.rename(columns={'Unnamed: 0': 'time'}, inplace=True)

# Save the grouped dataframe to a new CSV file
grouped_df.to_csv('ascat_diff_diff.csv', index=False)

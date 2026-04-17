import pandas as pd

df = pd.read_csv('cities_1500.csv')
print(df.loc[df.duplicated(subset=['ID'], keep=False)])
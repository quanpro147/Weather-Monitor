import openmeteo_requests

import pandas as pd
import requests_cache
from retry_requests import retry

# Setup the Open-Meteo API client with cache and retry on error
cache_session = requests_cache.CachedSession('.cache', expire_after = -1)
retry_session = retry(cache_session, retries = 5, backoff_factor = 0.2)
openmeteo = openmeteo_requests.Client(session = retry_session)
long_lat_df = pd.read_csv("city_id.csv")
count = 0
for long_lat in long_lat_df.itertuples():
    if count < 1:
        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": long_lat.Latitude,
            "longitude": long_lat.Longitude,
            "start_date": "2017-01-01",
            "end_date": "2026-04-08",
            "daily": ["weather_code", "temperature_2m_max", "temperature_2m_min", "rain_sum", "shortwave_radiation_sum", "temperature_2m_mean", "wind_direction_10m_dominant", "wind_speed_10m_max", "relative_humidity_2m_mean", "relative_humidity_2m_max", "relative_humidity_2m_min", "wind_gusts_10m_max", "cloud_cover_max", "cloud_cover_min", "cloud_cover_mean", "wind_speed_10m_mean", "wind_gusts_10m_mean"],
            "timezone": "GMT",
        }
        responses = openmeteo.weather_api(url, params = params)
        response = responses[0]

        daily = response.Daily()
        daily_weather_code = daily.Variables(0).ValuesAsNumpy()
        daily_temperature_2m_max = daily.Variables(1).ValuesAsNumpy()
        daily_temperature_2m_min = daily.Variables(2).ValuesAsNumpy()
        daily_rain_sum = daily.Variables(3).ValuesAsNumpy()
        daily_shortwave_radiation_sum = daily.Variables(4).ValuesAsNumpy()
        daily_temperature_2m_mean = daily.Variables(5).ValuesAsNumpy()
        daily_wind_direction_10m_dominant = daily.Variables(6).ValuesAsNumpy()
        daily_wind_speed_10m_max = daily.Variables(7).ValuesAsNumpy()
        daily_relative_humidity_2m_mean = daily.Variables(8).ValuesAsNumpy()
        daily_relative_humidity_2m_max = daily.Variables(9).ValuesAsNumpy()
        daily_relative_humidity_2m_min = daily.Variables(10).ValuesAsNumpy()
        daily_wind_gusts_10m_max = daily.Variables(11).ValuesAsNumpy()
        daily_cloud_cover_max = daily.Variables(12).ValuesAsNumpy()
        daily_cloud_cover_min = daily.Variables(13).ValuesAsNumpy()
        daily_cloud_cover_mean = daily.Variables(14).ValuesAsNumpy()
        daily_wind_speed_10m_mean = daily.Variables(15).ValuesAsNumpy()
        daily_wind_gusts_10m_mean = daily.Variables(16).ValuesAsNumpy()

        
        daily_data = {"date": pd.date_range(
            start = pd.to_datetime(daily.Time(), unit = "s", utc = True),
            end =  pd.to_datetime(daily.TimeEnd(), unit = "s", utc = True),
            freq = pd.Timedelta(seconds = daily.Interval()),
            inclusive = "left"
        )}

        daily_data["weather_code"] = daily_weather_code
        daily_data["temperature_2m_max"] = daily_temperature_2m_max
        daily_data["temperature_2m_min"] = daily_temperature_2m_min
        daily_data["rain_sum"] = daily_rain_sum
        daily_data["shortwave_radiation_sum"] = daily_shortwave_radiation_sum
        daily_data["temperature_2m_mean"] = daily_temperature_2m_mean
        daily_data["wind_direction_10m_dominant"] = daily_wind_direction_10m_dominant
        daily_data["wind_speed_10m_max"] = daily_wind_speed_10m_max
        daily_data["relative_humidity_2m_mean"] = daily_relative_humidity_2m_mean
        daily_data["relative_humidity_2m_max"] = daily_relative_humidity_2m_max
        daily_data["relative_humidity_2m_min"] = daily_relative_humidity_2m_min
        daily_data["wind_gusts_10m_max"] = daily_wind_gusts_10m_max
        daily_data["cloud_cover_max"] = daily_cloud_cover_max
        daily_data["cloud_cover_min"] = daily_cloud_cover_min
        daily_data["cloud_cover_mean"] = daily_cloud_cover_mean
        daily_data["wind_speed_10m_mean"] = daily_wind_speed_10m_mean
        daily_data["wind_gusts_10m_mean"] = daily_wind_gusts_10m_mean

        daily_dataframe = pd.DataFrame(data = daily_data)
        daily_dataframe.to_csv(f"daily_data_{long_lat.Country + '_' + long_lat.City}.csv", index = False)
    else: 
        break
# url = "https://archive-api.open-meteo.com/v1/archive"
# params = {
# 	"latitude": 10.823,
# 	"longitude": 106.6296,
# 	"start_date": "2017-01-01",
# 	"end_date": "2026-04-08",
# 	"daily": ["weather_code", "temperature_2m_max", "temperature_2m_min", "rain_sum", "shortwave_radiation_sum", "temperature_2m_mean", "wind_direction_10m_dominant", "wind_speed_10m_max", "relative_humidity_2m_mean", "relative_humidity_2m_max", "relative_humidity_2m_min", "wind_gusts_10m_max", "cloud_cover_max", "cloud_cover_min", "cloud_cover_mean", "wind_speed_10m_mean", "wind_gusts_10m_mean"],
# 	"timezone": "GMT",
# }
# responses = openmeteo.weather_api(url, params = params)

# # Process first location. Add a for-loop for multiple locations or weather models
# response = responses[0]
# print(f"Coordinates: {response.Latitude()}°N {response.Longitude()}°E")
# print(f"Elevation: {response.Elevation()} m asl")
# print(f"Timezone: {response.Timezone()}{response.TimezoneAbbreviation()}")
# print(f"Timezone difference to GMT+0: {response.UtcOffsetSeconds()}s")

# # Process daily data. The order of variables needs to be the same as requested.
# daily = response.Daily()
# daily_weather_code = daily.Variables(0).ValuesAsNumpy()
# daily_temperature_2m_max = daily.Variables(1).ValuesAsNumpy()
# daily_temperature_2m_min = daily.Variables(2).ValuesAsNumpy()
# daily_rain_sum = daily.Variables(3).ValuesAsNumpy()
# daily_shortwave_radiation_sum = daily.Variables(4).ValuesAsNumpy()
# daily_temperature_2m_mean = daily.Variables(5).ValuesAsNumpy()
# daily_wind_direction_10m_dominant = daily.Variables(6).ValuesAsNumpy()
# daily_wind_speed_10m_max = daily.Variables(7).ValuesAsNumpy()
# daily_relative_humidity_2m_mean = daily.Variables(8).ValuesAsNumpy()
# daily_relative_humidity_2m_max = daily.Variables(9).ValuesAsNumpy()
# daily_relative_humidity_2m_min = daily.Variables(10).ValuesAsNumpy()
# daily_wind_gusts_10m_max = daily.Variables(11).ValuesAsNumpy()
# daily_cloud_cover_max = daily.Variables(12).ValuesAsNumpy()
# daily_cloud_cover_min = daily.Variables(13).ValuesAsNumpy()
# daily_cloud_cover_mean = daily.Variables(14).ValuesAsNumpy()
# daily_wind_speed_10m_mean = daily.Variables(15).ValuesAsNumpy()
# daily_wind_gusts_10m_mean = daily.Variables(16).ValuesAsNumpy()

# daily_data = {"date": pd.date_range(
# 	start = pd.to_datetime(daily.Time(), unit = "s", utc = True),
# 	end =  pd.to_datetime(daily.TimeEnd(), unit = "s", utc = True),
# 	freq = pd.Timedelta(seconds = daily.Interval()),
# 	inclusive = "left"
# )}

# daily_data["weather_code"] = daily_weather_code
# daily_data["temperature_2m_max"] = daily_temperature_2m_max
# daily_data["temperature_2m_min"] = daily_temperature_2m_min
# daily_data["rain_sum"] = daily_rain_sum
# daily_data["shortwave_radiation_sum"] = daily_shortwave_radiation_sum
# daily_data["temperature_2m_mean"] = daily_temperature_2m_mean
# daily_data["wind_direction_10m_dominant"] = daily_wind_direction_10m_dominant
# daily_data["wind_speed_10m_max"] = daily_wind_speed_10m_max
# daily_data["relative_humidity_2m_mean"] = daily_relative_humidity_2m_mean
# daily_data["relative_humidity_2m_max"] = daily_relative_humidity_2m_max
# daily_data["relative_humidity_2m_min"] = daily_relative_humidity_2m_min
# daily_data["wind_gusts_10m_max"] = daily_wind_gusts_10m_max
# daily_data["cloud_cover_max"] = daily_cloud_cover_max
# daily_data["cloud_cover_min"] = daily_cloud_cover_min
# daily_data["cloud_cover_mean"] = daily_cloud_cover_mean
# daily_data["wind_speed_10m_mean"] = daily_wind_speed_10m_mean
# daily_data["wind_gusts_10m_mean"] = daily_wind_gusts_10m_mean

# daily_dataframe = pd.DataFrame(data = daily_data)
# print("\nDaily data\n", daily_dataframe)

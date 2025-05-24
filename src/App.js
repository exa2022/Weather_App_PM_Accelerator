import { useState } from 'react';
import './App.css';
import logo from './search.png';
import location from './location_new.png';
import React from 'react';


function App() 
{
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [forecastData, setForecastData] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchType, setSearchType] = useState('city');
  const [countryCode, setCountryCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [optionType, setOptionType] = useState('Add');

  //This is used to store the weather data for the location that the user has searched for.
  const [weatherData, setWeatherData] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [humidityError, setHumidityError] = useState(null);

  const [cityForecasts, setCityForecasts] = useState({});
  const [forecastCity, setForecastCity] = useState(null);
  
  
  //This is used to store locations the user has added to the home screen (Add location)
  //screen. Whenever the user adds a location, it will be added to this array and then
  //displayed on the home screen.

  const [addedLocations, setAddedLocations] = useState([]);
  
  // Used to display the popup or card which will ask the user to update the 
  // the humidity level of the chosen location ONLY

  const [updateStatus1, setUpdateStatus1] = useState(false);


  const apiKey = "b0efcd6f094451f3083410fc2ddc25d8";

  //When user clicks on the add location button, it will add the current location to the database
  const addLocation = async () => {
  setError("");

  setSuccess("");

  if (searchType === "city" && city === "") {
    setError("Please enter a city");
    return;
  }

  //if the city does not exist in openweathermap, then we will send an error 
  if (searchType === "city") {
    const cityRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`
    );
    const cityJson = await cityRes.json();
    if (cityJson.cod !== 200) {
      setError("Invalid city name");
      return;
    }
  }

  if (searchType === "zip code" && zip === "") {
    setError("Please enter a zip code");
    return;
  }
  //Check if the zip code is valid or not
  if (searchType === "zip code") 
  {
    const zipOptions = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?zip=${zip}&appid=${apiKey}`
    )
    const zipJson = await zipOptions.json();
    if (zipJson.cod !== 200) {
      setError("Invalid zip code");
      return;
    }
  }

  if (countryCode === "") {
    setError("Please enter a country code");
    return;
  }

  const countryCodeRes = await fetch(
    `https://restcountries.com/v3.1/alpha/${countryCode}`
  );

  const countryCodeJson = await countryCodeRes.json();
  if (!Array.isArray(countryCodeJson)) {
    setError("Country code not found");
    return;
  }

  let param = searchType === "city" ? `q=${city},${countryCode}` : `zip=${zip},${countryCode}`;

  
  const weatherRes = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?${param}&appid=${apiKey}`
  );
  const weatherJson = await weatherRes.json();

  if (weatherJson.cod !== 200) {
    setError("No matching record found. Please check the city/zip and country code.");
    return;
  }

  const visitedData = {
    city: weatherJson.name,
    temperature: weatherJson.main.temp,
    condition: weatherJson.weather[0].description,
    icon: weatherJson.weather[0].icon,
    humidity: weatherJson.main.humidity,
    windSpeed: weatherJson.wind.speed,
    pressure: weatherJson.main.pressure,
    countryCode: countryCode,
  };

  // Add weather data to the array addedLocations
  //Only add the location if it is not already in the array
  const isLocationAlreadyAdded = addedLocations.some(
    (location) => location.city === visitedData.city && location.countryCode === visitedData.countryCode
  );

  if (isLocationAlreadyAdded) {
    setError("Location already added");
    return;
  }

  setAddedLocations((prevLocations) => [
    ...prevLocations,
    visitedData,
  ]);

  const locData = {
    city: visitedData.city,
    temperature: Math.round((visitedData.temperature - 273.15) * 1.8 + 32),
    humidity: visitedData.humidity,
    description: visitedData.condition,
    startDate: startDate,
    endDate: endDate,
    countryCode: visitedData.countryCode,
  };

  // Submit to backend
  const res = await fetch("https://weather-app-pm-accelerator.onrender.com/api/weather", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(locData),
  });

  const data = await res.json();

  if (!res.ok) 
  {
    setError(data.error);
  }
  else
  {
    setSuccess("Location added successfully");


    //Add a google map on the screen to show the location of the city using the google maps API

    const map = document.getElementById("map");

    // Construct the location from your visitedData object
    const location = encodeURIComponent(`${visitedData.city}, ${visitedData.countryCode}`);

    // Use the free, non-API embed link
    const embedUrl = `https://www.google.com/maps?q=${location}&output=embed`;

    map.innerHTML = `
      <iframe 
        src="${embedUrl}" 
        width="100%" 
        height="300" 
        style="border:0; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); margin-top: 20px;" 
        allowfullscreen="" 
        loading="lazy" 
        referrerpolicy="no-referrer-when-downgrade">
      </iframe>`;  

  }
};

  const showForecast = async (city) => {
  const forecastRes = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}`
  );
  const forecastJson = await forecastRes.json();

  if (forecastJson.cod !== "200") {
    setError("Forecast not found");
    return;
  }

  const finalForecast = forecastJson.list.filter((item) => {
    const time = item.dt_txt.split(" ")[1];
    return time === "12:00:00";
  }).slice(0, 5);

  setCityForecasts(prev => ({
    ...prev,
    [city]: finalForecast
  }));
  setForecastCity(city);
};


  const updateLocation = async (city, countryCode) =>
  {
    //This function will be used to update the "condition" of the location
    //The user will be able to update the location by entering the city and country code
    //If the location is not in the array, then we will send an error
    setHumidityError(null);
    setCity(city)
    setCountryCode(countryCode);
    setHumidity(null);

    if(humidity === null)
    {
      setHumidityError("Please enter a humidity level")
      return;
    }

    if(humidity < 1 || humidity > 100) {
      setHumidityError("Humidity must be between 1 and 100");
      return;
    }

    setHumidityError(null);
  
    setUpdateStatus1(true);
    
    const locData = 
    {
      city: searchType === "city" ? city : zip,
      countryCode: countryCode,
      humidity: humidity, // This is the new humidity level
    }

    const res = await fetch("https://weather-app-pm-accelerator.onrender.com/api/weather", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(locData),
    });

    const data = await res.json();
    console.log("Update response:", data);

    if (!res.ok)
    {
      setError(data.error || data.message || "Error updating location");
      return;
    }
    else
    {
      setUpdateStatus1(false);
    }

    //Now change the humidity in the addedLocations array
    const updatedLocations = addedLocations.map((location) => {
      if (location.city.toLowerCase() === city.toLowerCase() && location.countryCode.toLowerCase() === countryCode.toLowerCase()) {
        return {
          ...location,
          humidity: humidity,
        };
      }
      return location;
    });

    setAddedLocations(updatedLocations);

    return;
  }



  const deleteLocation = async (city, countryCode) => 
  {

    const updatedLocations = addedLocations.filter(
      (location) => location.city.toLowerCase() !== city.toLowerCase() || location.countryCode.toLowerCase() !== countryCode.toLowerCase()
    );

    setAddedLocations(updatedLocations);
    //If the location is not in the array, then we will send an error

    // If the location is in the array, then we will send a delete request to the backend
    setError(null);

    const locData = {
      city: city,
      countryCode: countryCode,
    };

    const res = await fetch("https://weather-app-pm-accelerator.onrender.com/api/weather", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(locData),
    });

    const data = await res.json();
    console.log("Delete response:", data);

    if (!res.ok) 
      {
      setError(data.error || data.message || "Error deleting location");
      return;
    }
  };

  // Have a keybind for the search button (Enter)
  const handleKeyPress = (e) => {
    if(e.key === 'Enter')
    {
      if(optionType === "Add") {
        addLocation();
      }
      else if(optionType === "Search") {
        handleSearchClick();
      }
      else if(optionType === "All Locations")
      {
        updateLocation(city, countryCode);
      }
    }
  }

  const handleInputChange = (e) => {
    // set the city and the zip code depending on the search type
    if(searchType === "city") {
      setCity(e.target.value);
    }
    else {
      setZip(e.target.value);
    }
  };

  const fetchWeather = async (query) => 
  {
    try {
      if (searchType === "city" && city === "") 
      {
        setError("Please enter a city");
        return;
      }

      //if the city does not exist in openweathermap, then we will send an error 
      if (searchType === "city") {
        const cityRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`
        );
        const cityJson = await cityRes.json();
        if (cityJson.cod !== 200) {
          setError("Invalid city name");
          return;
        }
      }

      if (searchType === "zip code" && zip === "") {
        setError("Please enter a zip code");
        return;
      }
      //Check if the zip code is valid or not
      if (searchType === "zip code") 
      {
        const zipOptions = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?zip=${zip}&appid=${apiKey}`
        )
        const zipJson = await zipOptions.json();
        if (zipJson.cod !== 200) {
          setError("Invalid zip code");
          return;
        }
      }

      if (countryCode === "") {
        setError("Please enter a country code");
        return;
      }

      const countryCodeRes = await fetch(
        `https://restcountries.com/v3.1/alpha/${countryCode}`
      );

      const countryCodeJson = await countryCodeRes.json();
      if (!Array.isArray(countryCodeJson)) {
        setError("Country code not found");
        return;
      }
      
      //Reset the error message if the user has entered a valid country code and city/zip code
      setError(null);

      let param = searchType === "city" ? `q=${query}` : `zip=${query}`;
      
      if(countryCode !== "") {
        param += `,${countryCode}`;
      }


      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?${param}&appid=${apiKey}`
      );
      const weatherJson = await weatherRes.json();

      if (weatherJson.cod !== 200) {
        setError(searchType + " not found");
        return;
      }

      setWeatherData({
        city: weatherJson.name,
        temperature: weatherJson.main.temp,
        condition: weatherJson.weather[0].description,
        icon: weatherJson.weather[0].icon,
        humidity: weatherJson.main.humidity,
        windSpeed: weatherJson.wind.speed,
        pressure: weatherJson.main.pressure,
        countryCode: countryCode,
      });


      //Now if the user has selected a date range, we will check if the dates are valid and then 
      // only show those dates in the forecast:
      if(startDate !== "" && endDate !== "") 
      {
        // const start = new Date(startDate);
        // const end = new Date(endDate);

        const start = new Date(startDate + "T00:00:00");
        const end = new Date(endDate + "T00:00:00");

        if(start > end) {
          setError("Start date cannot be greater than end date");
          return;
        }
        //The start date has to be the current day or greater than the current day
        
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        if (start < currentDate) 
        {
          setError("Start date cannot be less than current date");
          return;
        }
        //end date cannot be greater than 5 days from the current date
        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(currentDate.getDate() + 5);
        if (end > fiveDaysFromNow)
        {
          setError("End date cannot be greater than 5 days from now");
          return;
        }

        if((end - start) / (1000 * 60 * 60 * 24) >= 5)
        {
          setError("Date range cannot be greater than 5 days");
          return;
        }

        const startDateString = start.toISOString().split("T")[0];
        const endDateString = end.toISOString().split("T")[0];
        const forecastRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?${param}&appid=${apiKey}`
        );
        const forecastJson = await forecastRes.json();

        if (forecastJson.cod !== "200") {
          throw new Error(forecastJson.message || "Forecast not found");
        }

        const finalForecast = forecastJson.list.filter((item) => {
          const date = item.dt_txt.split(" ")[0];
          const time = item.dt_txt.split(" ")[1];
          return date >= startDateString && date <= endDateString && time === "12:00:00";
        }).slice(0, end - start + 1);

        setForecastData(finalForecast);

        //Change the label (5-Day Forecast) to the date range selected by the user
        const forecastTitle = document.getElementById("forecast-title");
        if(forecastTitle) {
          //If the start date is the current date, then do a different calculation
          if(start.toDateString() === currentDate.toDateString()) {
            forecastTitle.innerText = `${(end - start) / (1000 * 60 * 60 * 24)}-Day Forecast`;
          }
          else {
            forecastTitle.innerText = `${(end - start) / (1000 * 60 * 60 * 24) + 1}-Day Forecast`;
          }
        }
        return;
      }
      if(startDate !== "" && endDate === "") {
        setError("Please enter an end date");
        return;
      }
      if(startDate === "" && endDate !== "") {
        setError("Please enter a start date");
        return;
      }

      // Else, fetch the entire 5-day forecast
      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?${param}&appid=${apiKey}`
      );
      const forecastJson = await forecastRes.json();

      if (forecastJson.cod !== "200") {
        throw new Error(forecastJson.message || "Forecast not found");
      }

      const finalForecast = forecastJson.list.filter((item) => {
        const time = item.dt_txt.split(" ")[1];
        return time === "12:00:00";
      }).slice(0, 5);

      setForecastData(finalForecast);
      
    } catch (err) {
      // setWeatherData(null);
      // setForecastData([]);
      setError(err.message);
    }
  };

  const handleSearchClick = () => {
    if(searchType === "city") {
      fetchWeather(city);
    }
    else {
      fetchWeather(zip);
    }
    
  };


  const handleGeoLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => 
      {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          const weatherRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`
          );
          const weatherJson = await weatherRes.json();

          setWeatherData({
            city: weatherJson.name,
            temperature: weatherJson.main.temp,
            condition: weatherJson.weather[0].description,
            icon: weatherJson.weather[0].icon,
            humidity: weatherJson.main.humidity,
            windSpeed: weatherJson.wind.speed,
            pressure: weatherJson.main.pressure,
            countryCode: weatherJson.sys.country,
          });

          const forecastRes = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}`
          );

          const forecastJson = await forecastRes.json();

          if (forecastJson.cod !== "200") {
            throw new Error(forecastJson.message || "Forecast not found");
          }

          const finalForecast = forecastJson.list.filter((item) => {
            const time = item.dt_txt.split(" ")[1];
            return time === "12:00:00";
          }).slice(0, 5);

          setForecastData(finalForecast);

        } catch (err) {
          setError("Could not fetch weather for current location.");
        }
      },
      () => {
        setError("Unable to retrieve your location");
      }
    );
  };


  return (
    <div className = "container">
      <div className="App">

        {/* <video autoPlay loop muted className = "back-video">
          <source src="/moving_image_background.mp4" type="video/mp4" />
          Your browser does not support HTML5 video.
        </video> */}

        <h1>Weather Report</h1>

        <div className="search-bar-container">

          <select
            value = {optionType}
            className = "options" 
            onChange = {(e) => {
              setOptionType(e.target.value)
              setCity("");
              setZip("");
              setSuccess(null);
              setError(null);
              setStartDate("");
              setEndDate("");
              setCountryCode("");
              setUpdateStatus1(false);
              setHumidityError(null);
              setForecastCity(null);
            }}
          >
            <option value="Add">Add location</option>
            <option value="Search">Search location</option>
            <option value="All Locations">My Locations</option>


          </select>

          {optionType === "Add" && (
            <>

              <select
                className="dropdown"
                onChange={(e) => setSearchType(e.target.value)}
                value={searchType}
              >
                <option value="city">City</option>
                <option value="zip code">Zip Code</option>
              </select>

              <input
                type="text"
                placeholder={`Enter ${searchType}`}
                className="search-bar"
                onChange={handleInputChange}
                value = {searchType === "city" ? city : zip}
                onKeyUp={handleKeyPress}
              />


              <input
                type = "text"
                placeholder='Enter 2-Letter Country Code'
                className='country-code'
                value = {countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                onKeyUp={handleKeyPress}
              />

              {/* Add Location Button */}
              <button 
                className="add-button" 
                onClick={addLocation}
              >
                Add
              </button>

            </>
          )}

          {optionType === "Search" && (
            <>

              <select 
                  className="dropdown"
                  onChange={(e) => setSearchType(e.target.value)}
                  value={searchType}
                >
                <option value="city">City</option>
                <option value="zip code">Zip Code</option>
              </select>


              <input
                type="text"
                placeholder={`Enter ${searchType}`}
                className="search-bar"
                onChange={handleInputChange}
                value = {searchType === "city" ? city : zip}
                onKeyUp={handleKeyPress}
              />


              <input
                type = "text"
                placeholder='Enter 2-Letter Country Code'
                className='country-code'
                value = {countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                onKeyUp={handleKeyPress}
              />

              {/* Section for date pickers - start and end */}

              <input
                type="date"
                className="date-picker"
                onChange={(e) => setStartDate(e.target.value)}
                value = {startDate}
              />

              <input
                type="date"
                className="date-picker"
                onChange={(e) => setEndDate(e.target.value)}
                value = {endDate}
              />


              <button className="search-button" onClick={handleSearchClick}>
                <img src={logo} alt="search-icon" className="search-icon" />
              </button>
              <button className="geo-button" onClick={handleGeoLocation}>
                <img src = {location} alt="location-icon" className="location-icon" />
                <span class="tooltip">My location</span>
              </button>
            
            </>
          )}
        </div>


        {error && <p className="error-message">Error: {error}</p>}
        {success && <p className="success-message">Success: {success}</p>}

        {/* Display the weather cards for the added locations */}
        {/* This will only be displayed when the user has added a location */}
        {/* The weather data will be fetched from the backend and displayed here */}

        {/* If the option type is Add, then I want to display the google map */}
        {optionType === "Add" && (
          <div id="map">
            {/* Google Map will be displayed here */}
          </div>
        )}

        {/* Display the weather cards for the added locations */}
        {/* This will only be displayed when the user has added a location */}
        {/* The weather data will be fetched from the backend and displayed here */}

        {optionType === "All Locations" && addedLocations.length > 0 && (
          <div className="weather-grid">
            {addedLocations.map((data, index) => (
              <div className="weather-card" key={index}>
                <h2>{data.city}, {data.countryCode.toUpperCase()}</h2>

                {/* Button delete the location*/}
                <button
                  className = "delete-button"
                  onClick = {() => {
                    deleteLocation(data.city, data.countryCode);
                  }}
                >
                  Delete
                </button>

                {/* Button to update the location */}
                <button
                  className = "update-button"
                  onClick = {() => {
                    setCity(data.city);
                    setCountryCode(data.countryCode);
                    setUpdateStatus1(true);
                  }}
                >
                  Update
                </button>

                <img
                  src={`http://openweathermap.org/img/wn/${data.icon}@2x.png`}
                  alt={data.condition}
                  className="weather-icon2"
                />
                <p>Temperature: {Math.round((data.temperature - 273.15)* 1.8 + 32)}°F</p>
                <p>Condition: {data.condition}</p>
                <p>Humidity: {data.humidity}%</p>
                <p>Wind Speed: {data.windSpeed} km/h</p>
                <p>Pressure: {Math.round(data.pressure * 0.1)} kPa</p>


                {/* Button to show 5-day forecast if the user wants to see it */}
                <button
                  className = "forecast-button"
                  onClick = {() => {
                    setCountryCode(data.countryCode);
                    showForecast(data.city);
                  }}
                >
                    5-Day Forecast
                </button>

                {/* Button to hide 5-day forecast */}
                <button
                  className = "hide-forecast-button"
                  onClick = {() => {
                    if(forecastCity === data.city) {
                      setForecastCity(null);
                    }
                  }}
                  >
                    Hide Forecast
                </button>
              </div>
            ))}

            {forecastCity && cityForecasts[forecastCity] && (
              <div className="forecast-panel-new">
                <h2>5-Day Forecast for {forecastCity}, {countryCode.toUpperCase()}</h2>
                <div className="forecast-row-new">
                  {cityForecasts[forecastCity].map((day, index) => (
                    <div className="forecast-card-new" key={index}>
                      <p id="day">
                        {new Date(day.dt_txt).toLocaleDateString(undefined, { weekday: "short" })}
                      </p>
                      <img
                        src={`http://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
                        alt={day.weather[0].description}
                        className="forecast-icon-new"
                      />
                      <p>Low: {Math.round((day.main.temp_min - 273.15) * 1.8 + 32)}°F</p>
                      <p>High: {Math.round((day.main.temp_max - 273.15) * 1.8 + 32)}°F</p>
                      <p>Condition: {day.weather[0].description}</p>
                      <p>Humidity: {day.main.humidity}%</p>
                      <p>Wind: {day.wind.speed} km/h</p>
                      <p>Pressure: {Math.round(day.main.pressure * 0.1)} kPa</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Display the current weather card for the Search Section ONLY */}
        {/* At first, I don't want to see any current weather card, only when the user 
        search something */}

        {optionType === "Search" && weatherData && (
          <div className="weather-card">
            <h2>{weatherData.city}, {weatherData.countryCode.toUpperCase()}</h2>
            <img
              src={`http://openweathermap.org/img/wn/${weatherData.icon}@2x.png`}
              alt={weatherData.condition}
              className="weather-icon1"
            />
            <p>Temperature: {Math.round((weatherData.temperature - 273.15)* 1.8 + 32)}°F</p>
            <p>Condition: {weatherData.condition}</p>
            <p>Humidity: {weatherData.humidity}%</p>
            <p>Wind Speed: {weatherData.windSpeed} km/h</p>
            <p>Pressure: {Math.round(weatherData.pressure * 0.1)} kPa</p>
          </div>
        )}


        {optionType === "Search" && forecastData.length > 0 && (
          <>
            {/* I want this to be stable as in if it says 3 Day forecast and user changes
            the tab but comes back, it should stay as 3 day forecast */}

            <h2 id = "forecast-title">Upcoming Forecast</h2>
            <div className="forecast-panel">
              {forecastData.map((day, index) => (
                <div className="forecast-card" key={index}>
                  <p id = "day">{new Date(day.dt_txt).toLocaleDateString(undefined, { weekday: 'short' })}</p>
                  <img
                    src={`http://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
                    alt={day.weather[0].description}
                    className = "forecast-icon"
                  />
                  <p>Low: {Math.round((day.main.temp_min - 273.15)* 1.8 + 32)}°F</p>
                  <p>High: {Math.round((day.main.temp_max - 273.15)* 1.8 + 32)}°F</p>
                  <p>Condition: {day.weather[0].description}</p>
                  <p>Humidity: {day.main.humidity}%</p>
                  <p>Wind: {day.wind.speed} km/h</p>
                  <p>Pressure: {Math.round(day.main.pressure * 0.1)} kPa</p>
                </div>
              ))}
            </div>
          </>
        )}

        {updateStatus1 && (
          <div className="update-popup">
            <h2>Update</h2>
            <p id = "msg"><b>Note:</b> Only the humidity level can be updated</p>
            <input
              type="number"
              placeholder="Enter new humidity level"
              className="update-input"
              onChange={(e) => setHumidity(e.target.value)}
              //Restrict the input to be between 1 and 100
              onKeyUp={handleKeyPress}
              
            />

            {humidityError && <p className="humid-message">Error: {humidityError}</p>}
            
            <button 
              className="update-button2" 
              onClick={() => {
                updateLocation(city, countryCode, humidity);
              }}
            >
              Update
            </button>

            <button
              className = "cancel-button"
              onClick={() => {
                setHumidityError(false);
                setUpdateStatus1(false);
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Footer Section */}
      </div>

      <footer className='footer'>
          <p>Weather App by Ekansh Agrawal</p>
          <p>&copy; 2025 | <a className="linked_link" href='https://www.linkedin.com/company/pm-accelerator/'>PM Accelerator</a> | All Rights Reserved</p>
      </footer>
    </div>
  );
}

export default App;

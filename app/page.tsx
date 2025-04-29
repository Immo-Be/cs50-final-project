import React from "react";
import Earth from "./components/Earth";
import airports from "./airports.json" assert { type: "json" };

// Define the FlightPath type
export type Airport = {
  city: string;
  country: string;
  lat: number;
  lng: number;
};

export type FlightDataResponse = {
  airline2LCode: string;
  airlineName: string;
  arrivalTerminal: string;
  cancelled: boolean;
  codeShareInfoFlightnumber: string[];
  diverted: boolean;
  expectedArrivalTime: string;
  flightStatusArrival: string;
  flightnumber: string;
  gepTerminal: string;
  originAirport3LCode: string;
  originAirportLongName: string;
  originAirportLongNameInt: string;
  originAirportName: string;
  originAirportNameInt: string;
  plannedArrivalTime: string;
  viaAirport3LCode: string | null;
  viaAirportName: string | null;
}[];

export type FlightPathData = {
  id: string;
  start: Airport;
  destination: Airport;
  color?: string;
};

function convertFlightDataToFlightPath(
  flightDataRaw: FlightDataResponse,
): FlightPathData[] {
  console.log("Flight Data Raw", flightDataRaw);
  return flightDataRaw.map((data) => {
    if (!airports[data.originAirport3LCode]) {
      return ;
    }
    return {
      id: data.flightnumber,
      start: airports["HAM"],
      destination: airports[data.originAirport3LCode],
      color: "#FF0000",
    };
  });
}

export default async function Home() {
  const arrivalResponse = await fetch(
    "https://rest.api.hamburg-airport.de/v2/flights/arrivals",
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": "ceed642d93bb4c51ae597948aa06b2c3",
      },
    },
  );

  const arrivals = await arrivalResponse.json();
  // console.log(arrivals);
  console.log(convertFlightDataToFlightPath(arrivals));
  //
  return <Earth flightPathsData={convertFlightDataToFlightPath(arrivals)} />;
}

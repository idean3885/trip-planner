"""Unit tests for Flights tool response parsing in hotels_server.py."""
import json
import pytest
from pathlib import Path

FIXTURES = Path(__file__).parent.parent / "fixtures"


def load_fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


# ---------------------------------------------------------------------------
# search_flight_destinations parsing
# ---------------------------------------------------------------------------

class TestSearchFlightDestinationsParsing:
    """Replicate the formatting logic from search_flight_destinations()."""

    def _format(self, result: dict) -> str:
        data = result.get("data", [])
        if not data:
            return "No flight destinations found."

        formatted = []
        for dest in data[:10]:
            info = (
                f"Name: {dest.get('name', 'Unknown')}\n"
                f"ID: {dest.get('id', 'N/A')}\n"
                f"Type: {dest.get('type', 'N/A')}\n"
                f"City: {dest.get('cityName', 'N/A')}\n"
                f"Country: {dest.get('countryName', 'N/A')}\n"
                f"IATA: {dest.get('code', 'N/A')}"
            )
            formatted.append(info)

        return "\n---\n".join(formatted)

    def test_formats_three_destinations(self):
        data = load_fixture("flights_search_destinations.json")
        result = self._format(data)
        assert "Lisbon" in result
        assert "Porto" in result
        assert "Madrid" in result

    def test_formats_airport_id(self):
        data = load_fixture("flights_search_destinations.json")
        result = self._format(data)
        assert "LIS.AIRPORT" in result
        assert "OPO.AIRPORT" in result
        assert "MAD.AIRPORT" in result

    def test_formats_iata_code(self):
        data = load_fixture("flights_search_destinations.json")
        result = self._format(data)
        assert "IATA: LIS" in result

    def test_formats_country(self):
        data = load_fixture("flights_search_destinations.json")
        result = self._format(data)
        assert "Portugal" in result
        assert "Spain" in result

    def test_destinations_separated_by_divider(self):
        data = load_fixture("flights_search_destinations.json")
        result = self._format(data)
        assert "---" in result

    def test_empty_data_returns_no_destinations_message(self):
        result = self._format({"data": []})
        assert result == "No flight destinations found."

    def test_missing_data_key_returns_no_destinations_message(self):
        result = self._format({})
        assert result == "No flight destinations found."


# ---------------------------------------------------------------------------
# search_flights parsing
# ---------------------------------------------------------------------------

class TestSearchFlightsParsing:
    """Replicate the formatting logic from search_flights()."""

    def _format(self, result: dict) -> str:
        data = result.get("data", {})
        if not data:
            return "No flights found."

        flights = data.get("flightOffers", data.get("flights", []))
        if not flights:
            return "No flight offers found for this route and date."

        formatted = []
        for i, flight in enumerate(flights[:10]):
            parts = []
            parts.append(f"--- Flight {i+1} ---")

            price_raw = flight.get("priceBreakdown", {}).get("total", {})
            if price_raw:
                parts.append(f"Price: {price_raw.get('currencyCode', 'EUR')} {price_raw.get('units', 'N/A')}")

            segments = flight.get("segments", [])
            for seg in segments:
                dep = seg.get("departureAirport", {})
                arr = seg.get("arrivalAirport", {})
                dep_time = seg.get("departureTime", "N/A")
                arr_time = seg.get("arrivalTime", "N/A")
                duration = seg.get("totalTime", 0)
                hours = duration // 3600
                mins = (duration % 3600) // 60

                carrier = ""
                legs = seg.get("legs", [])
                if legs:
                    carrier = legs[0].get("carriersData", [{}])[0].get("name", "Unknown")
                    flight_num = legs[0].get("flightInfo", {}).get("flightNumber", "")
                    carrier_code = legs[0].get("flightInfo", {}).get("carrierInfo", {}).get("operatingCarrier", "")
                    if carrier_code and flight_num:
                        carrier = f"{carrier} ({carrier_code}{flight_num})"

                stops = len(legs) - 1 if legs else 0
                stop_text = "Direct" if stops == 0 else f"{stops} stop(s)"

                parts.append(f"  {dep.get('code', '?')} {dep_time} → {arr.get('code', '?')} {arr_time}")
                parts.append(f"  Airline: {carrier}")
                parts.append(f"  Duration: {hours}h {mins}m | {stop_text}")

            baggage = flight.get("baggagePolicy", {})
            if baggage:
                cabin_bag = baggage.get("cabin", {}).get("allowance", "N/A")
                checked_bag = baggage.get("checked", {}).get("allowance", "N/A")
                parts.append(f"  Baggage: cabin={cabin_bag}, checked={checked_bag}")

            formatted.append("\n".join(parts))

        return "\n\n".join(formatted)

    def test_formats_two_flights(self):
        data = load_fixture("flights_search_flights.json")
        result = self._format(data)
        assert "--- Flight 1 ---" in result
        assert "--- Flight 2 ---" in result

    def test_formats_price(self):
        data = load_fixture("flights_search_flights.json")
        result = self._format(data)
        assert "EUR 89" in result
        assert "EUR 62" in result

    def test_formats_route(self):
        data = load_fixture("flights_search_flights.json")
        result = self._format(data)
        assert "OPO" in result
        assert "MAD" in result

    def test_formats_airline_with_flight_number(self):
        data = load_fixture("flights_search_flights.json")
        result = self._format(data)
        assert "Iberia (IB1234)" in result
        assert "Vueling (VY5678)" in result

    def test_formats_duration(self):
        data = load_fixture("flights_search_flights.json")
        result = self._format(data)
        # 5400 seconds = 1h 30m
        assert "1h 30m" in result

    def test_formats_direct_flight(self):
        data = load_fixture("flights_search_flights.json")
        result = self._format(data)
        assert "Direct" in result

    def test_formats_baggage_policy(self):
        data = load_fixture("flights_search_flights.json")
        result = self._format(data)
        assert "Baggage:" in result
        assert "cabin=1 bag (10kg)" in result

    def test_formats_checked_baggage_included(self):
        data = load_fixture("flights_search_flights.json")
        result = self._format(data)
        assert "23kg included" in result

    def test_empty_data_returns_no_flights_message(self):
        result = self._format({})
        assert result == "No flights found."

    def test_empty_flight_offers_returns_no_offers_message(self):
        result = self._format({"data": {"flightOffers": []}})
        assert result == "No flight offers found for this route and date."

    def test_fallback_to_flights_key_when_no_flightoffers(self):
        """Falls back to 'flights' key if 'flightOffers' is absent."""
        data = load_fixture("flights_search_flights.json")
        # Rename flightOffers -> flights
        raw = data["data"].pop("flightOffers")
        data["data"]["flights"] = raw
        result = self._format(data)
        assert "--- Flight 1 ---" in result

import unittest

from analytics.production_series import AnalysisInputError, prepare_daily_series


class PrepareDailySeriesTests(unittest.TestCase):
    def test_missing_days_remain_null_and_shifts_are_summed(self) -> None:
        result = prepare_daily_series(
            {
                "start_date": "2026-08-28",
                "end_date": "2026-08-31",
                "output_unit": "TON",
                "records": [
                    {"date": "2026-08-29", "quantity": 100, "unit": "TON"},
                    {"date": "2026-08-29", "quantity": 250.5, "unit": "TON"},
                    {"date": "2026-08-31", "quantity": 300, "unit": "TON"},
                ],
            }
        )

        self.assertEqual(result["observed_day_count"], 2)
        self.assertEqual(result["missing_day_count"], 2)
        self.assertEqual(result["total_quantity"], 650.5)
        self.assertEqual(
            result["points"],
            [
                {
                    "date": "2026-08-28",
                    "quantity": None,
                    "is_missing": True,
                    "record_count": 0,
                },
                {
                    "date": "2026-08-29",
                    "quantity": 350.5,
                    "is_missing": False,
                    "record_count": 2,
                },
                {
                    "date": "2026-08-30",
                    "quantity": None,
                    "is_missing": True,
                    "record_count": 0,
                },
                {
                    "date": "2026-08-31",
                    "quantity": 300.0,
                    "is_missing": False,
                    "record_count": 1,
                },
            ],
        )

    def test_observed_zero_is_not_a_missing_day(self) -> None:
        result = prepare_daily_series(
            {
                "records": [
                    {"date": "2026-08-31", "quantity": 0, "unit": "TON"}
                ]
            }
        )

        self.assertEqual(result["observed_day_count"], 1)
        self.assertEqual(result["missing_day_count"], 0)
        self.assertEqual(result["points"][0]["quantity"], 0.0)
        self.assertFalse(result["points"][0]["is_missing"])

    def test_mass_units_can_be_converted_explicitly(self) -> None:
        result = prepare_daily_series(
            {
                "output_unit": "TON",
                "records": [
                    {"date": "2026-08-31", "quantity": 500, "unit": "KILOGRAM"},
                    {"date": "2026-08-31", "quantity": 1.25, "unit": "TON"},
                ],
            }
        )

        self.assertEqual(result["total_quantity"], 1.75)
        self.assertEqual(result["points"][0]["record_count"], 2)

    def test_incompatible_units_are_rejected(self) -> None:
        with self.assertRaisesRegex(AnalysisInputError, "dönüştürülemez"):
            prepare_daily_series(
                {
                    "output_unit": "TON",
                    "records": [
                        {"date": "2026-08-31", "quantity": 5, "unit": "UNIT"}
                    ],
                }
            )

    def test_invalid_calendar_date_is_rejected(self) -> None:
        with self.assertRaisesRegex(AnalysisInputError, "geçerli bir tarih"):
            prepare_daily_series(
                {
                    "records": [
                        {"date": "2026-02-30", "quantity": 5, "unit": "TON"}
                    ]
                }
            )


if __name__ == "__main__":
    unittest.main()

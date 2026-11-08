# Lenient Unit identity

A Unit is identified by its Chassis Serial Number when present, falling back to License Plate otherwise; duplicates warn rather than block. A hard unique constraint on chassis/VIN was rejected because the source data contains duplicates and empty values, and re-bought bikes legitimately reuse a chassis number.

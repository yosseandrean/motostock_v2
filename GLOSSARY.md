# Motostock

Tracks the secondhand motorcycle inventory and sales of a dealership: which units are in stock, what each cost, and what sold units earned.

## Language

**Unit**:
One physical motorcycle the shop has acquired, represented as one record. A motorcycle bought back after being sold is entered as a new Unit.
_Avoid_: Bike, vehicle, stock item, row

**Status**:
Whether a Unit is currently held or has been sold. A Unit is **In Stock** until it has a Sell Price, after which it is **Sold**.
_Avoid_: State, condition

**Buy Price**:
The amount paid to acquire the motorcycle.
_Avoid_: Purchase price, harga beli, acquisition cost

**Cost**:
Additional money spent on a Unit beyond its Buy Price (reconditioning, service, BBN, fees).
_Avoid_: Expense, overhead, reconditioning cost

**Invested**:
The total money put into a Unit: Buy Price plus Cost.
_Avoid_: Total cost, capital outlay, modal

**Sell Price**:
The amount a Sold Unit was sold for.
_Avoid_: Sale price, revenue, harga jual

**Model Year**:
The year the motorcycle was produced, distinct from when the shop acquired it (Date Bought).
_Avoid_: Year, production year

**Sales Person**:
A person who sells a Unit on the shop's behalf, recorded on a Sold Unit.
_Avoid_: Salesman, seller, staff

**Bought From**:
The person or entity the shop acquired a Unit from — an auction house, a financing company, or a named individual. Free text with de-duplication suggestions.
_Avoid_: Source, supplier, previous owner

**Gross Profit**:
Sell Price minus Invested, for a Sold Unit.
_Avoid_: Profit, margin, net

**Margin**:
Gross Profit divided by Sell Price, for a Sold Unit.
_Avoid_: Markup, profit percentage

**Age**:
For an In Stock Unit, the number of days since Date Bought.
_Avoid_: Days in stock, holding period

**Stale**:
An In Stock Unit whose Age exceeds the stale threshold (90 days).
_Avoid_: Aged stock, old stock, dead stock

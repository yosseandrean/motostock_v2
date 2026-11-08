# Flat Unit record over an event model

Each row of the inventory is modelled as one Unit with a derived Status (In Stock / Sold), rather than separate Buy and Sale events. A motorcycle bought back after being sold ("BELI KEMBALI") is entered as a new Unit. Chosen for parity with the existing spreadsheet and simplicity; the event model was rejected because the shop rarely re-buys the same bike.

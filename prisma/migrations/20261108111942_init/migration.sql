-- CreateTable
CREATE TABLE "units" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelYear" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "buyPrice" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "sellPrice" INTEGER,
    "dateBought" DATETIME NOT NULL,
    "dateSold" DATETIME,
    "salesPerson" TEXT,
    "nameOnRegistration" TEXT,
    "chassisSerialNumber" TEXT,
    "engineSerialNumber" TEXT,
    "boughtFrom" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

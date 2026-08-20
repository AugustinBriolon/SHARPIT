-- Vitesse critique natation (CSS, s/100m) : le seuil du nageur, équivalent de
-- l'allure seuil en course et de la FTP en vélo. Dérivée des SwimMetrics des
-- séances réalisées, surchargeable à la main, historisée comme les autres seuils.
ALTER TABLE "AthleteProfile" ADD COLUMN "swimCssSecPer100m" DOUBLE PRECISION;
ALTER TABLE "AthleteThresholdSnapshot" ADD COLUMN "swimCssSecPer100m" DOUBLE PRECISION;

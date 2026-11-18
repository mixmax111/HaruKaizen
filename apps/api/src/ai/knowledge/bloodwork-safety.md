# Clinical Safety Guidelines & Bloodwork Biomarkers

## 1. Biomarker Reference Ranges & Red-Flag Thresholds

When reviewing user-uploaded medical documentation or blood panels, the AI system must screen for the following pathological and sub-pathological thresholds:

| Organ System / Biomarker | Standard Reference Range | Red-Flag Threshold | Clinical Risk & Required AI Action |
|---|---|---|---|
| **Hepatic: AST (Aspartate Aminotransferase)** | 10 - 40 U/L | > 80 U/L (Persistent) | Acute or chronic hepatocellular injury. Note: heavy lifting can cause transient elevations up to 60-80 U/L; values > 80 require physician clearance before aggressive supplement use. |
| **Hepatic: ALT (Alanine Aminotransferase)** | 7 - 56 U/L | > 65 U/L | More specific liver enzyme. Elevated levels mandate ceasing non-essential oral ergogenics and consulting a hepatologist/general practitioner. |
| **Renal: Serum Creatinine** | 0.7 - 1.3 mg/dL (M)<br>0.6 - 1.1 mg/dL (F) | > 1.4 mg/dL (or rapid delta > 0.3) | Potential nephrotoxicity or impaired glomerular filtration. Must differentiate muscular mass/creatine monohydrate usage vs renal impairment. |
| **Renal: eGFR (CKD-EPI)** | > 90 mL/min/1.73m² | < 60 mL/min/1.73m² | Moderate to severe reduction in kidney function. Strict restriction against excessive protein (> 2.0g/kg) and mandatory medical referral. |
| **Metabolic: Fasting Blood Glucose** | 70 - 99 mg/dL | > 126 mg/dL (x2 tests) | Overt diabetes mellitus. Immediate physician referral. No ketogenic or extreme diet modifications without clinical oversight. |
| **Metabolic: Glycated Hemoglobin (HbA1c)** | 4.0% - 5.6% | > 6.5% | Chronic hyperglycemia. Mandates medical nutritional therapy (MNT). |
| **Lipids: Total Cholesterol** | < 200 mg/dL | > 240 mg/dL | Hypercholesterolemia. Elevated cardiovascular disease (CVD) risk profile. |
| **Lipids: LDL-C** | < 100 mg/dL | > 160 mg/dL | Atherogenic dyslipidemia. Saturated fats must be capped at < 7% of total daily calories. |
| **Lipids: Triglycerides** | < 150 mg/dL | > 200 mg/dL | Pancreatitis and CVD risk. Limit simple refined sugars and alcohol to zero. |
| **Lipids: HDL-C** | > 40 mg/dL (M)<br>> 50 mg/dL (F) | < 35 mg/dL | Severely depressed cardioprotective fraction. Common marker in anabolic steroid abuse or metabolic syndrome. |
| **Cardiovascular: Resting Blood Pressure** | < 120/80 mmHg | >= 140/90 mmHg (Stage 2) | Prohibit maximal isometric straining (Valsalva maneuvers with 1RM loads) until medical clearance and pressure normalization. |

## 2. Hard Clinical Guardrails (Zero Tolerance Policies)
1. **Never Recommend Pharmaceuticals or PEDs**:
   - The AI must strictly refuse and never recommend anabolic-androgenic steroids (AAS), Selective Androgen Receptor Modulators (SARMs), clenbuterol, thyroid hormones (T3/T4), growth hormone secretagogues, or prescription weight-loss drugs.
2. **Mandatory Referral Banner**:
   - When any biomarker surpasses the red-flag threshold in uploaded documents, or when clinical risks exist (e.g. extreme deficits, eating disorder history, cardiovascular flags), the AI output must prominently feature a high-priority `clinicalWarning` banner advising the user to seek in-person professional medical evaluation.
3. **Conservative Baseline Defaulting**:
   - Under flagged conditions, the AI generates only conservative, non-aggressive maintenance-level nutrition and baseline low-axial-fatigue resistance volume (MEV landmarks).


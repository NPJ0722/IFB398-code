import { useState } from "react";

import {
    RegistrationLayout as Reg,
    Field,
    InfoBox,
} from "../components/RegistrationLayout";

const yogaStyles = [
    "Hatha",
    "Ashtanga",
    "Vinyasa / Flow",
    "Iyengar",
    "Power",
    "Anusara",
    "Bikram / Hot",
    "Kundalini",
    "Gentle",
    "Restorative",
    "Yin",
];

const yogaGoals = [
    "Improve fitness",
    "Increase well-being",
    "Injury rehabilitation",
    "Positive reinforcement",
    "Strength training",
    "Reduce stress",
];

const yogaInterests = [
    "Asana (postures)",
    "Pranayama (breath work)",
    "Meditation",
    "Yoga Philosophy",
    "Eastern Energy Systems",
];

const healthConditions = [
    "Diabetes type 1 or 2",
    "High / low blood pressure",
    "Insomnia",
    "Anxiety / depression",
    "Asthma / shortness of breath",
    "Numbness / tingling",
    "Cancer",
    "Pregnancy",
    "Surgery",
    "Seizures",
    "Stroke",
    "Heart conditions / chest pain",
    "Auto-immune condition",
    "Broken / dislocated bones",
    "Muscle strain / sprain",
    "Arthritis / bursitis",
    "Disc problems",
    "Scoliosis",
    "Back problems",
    "Osteoporosis",
];

export default function Intake({ go, Header, currentClient }) {
    const [intakeData, setIntakeData] = useState({
        experienceLevel: "Beginner",
        yearsOfPractice: "",
        previousExperience: "",

        hadYogaTherapy: "No",
        lastYogaTherapySession: "",
        yogaTherapyFrequency: "",
        yogaStyles: [],
        otherYogaStyle: "",

        goals: [],
        otherGoals: "",

        yogaInterests: [],
        otherYogaInterest: "",

        activityLevel: "Average",
        stressLevel: "5",

        hasInjury: "No",
        injuryDetails: "",

        healthConditions: [],
        otherHealthCondition: "",

        takingMedication: "No",
        medicationDetails: "",

        accessibilityRequirements: "",
        medicalCare: "",
        additionalInformation: "",
    });

    const updateIntake = (field, value) => {
        setIntakeData((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const toggleArrayValue = (field, value) => {
        setIntakeData((current) => {
            const currentValues = current[field];

            return {
                ...current,
                [field]: currentValues.includes(value)
                    ? currentValues.filter((item) => item !== value)
                    : [...currentValues, value],
            };
        });
    };

    const handleSaveIntake = async () => {
        try {
            if (!currentClient?.id) {
                alert("No client selected. Please return to Add New Client.");
                return;
            }

            const response = await fetch("http://localhost:3001/api/intakes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    clientId: currentClient.id,
                    ...intakeData,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Failed to save intake form.");
                return;
            }

            console.log("Intake saved:", data);

            go("eligibility");
        } catch (error) {
            console.error("Failed to save intake:", error);
            alert("Could not save the intake form.");
        }
    };

    return (
        <Reg
            title="Client Intake Form"
            subtitle="Collect information to help provide a safe and tailored yoga experience."
            step={2}
            back={() => go("add-client")}
            next={handleSaveIntake}
            nextLabel="Save & Continue"
            Header={Header}
        >

            {/* YOGA EXPERIENCE */}

            <h2>Yoga experience</h2>

            <Field label="Experience level *">
                <select
                    value={intakeData.experienceLevel}
                    onChange={(e) =>
                        updateIntake("experienceLevel", e.target.value)
                    }
                >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                </select>
            </Field>

            <Field label="Years of practice (optional)">
                <input
                    placeholder="e.g. 1–2 years"
                    value={intakeData.yearsOfPractice}
                    onChange={(e) =>
                        updateIntake("yearsOfPractice", e.target.value)
                    }
                />
            </Field>

            <Field label="Previous yoga experience">
                <textarea
                    value={intakeData.previousExperience}
                    onChange={(e) =>
                        updateIntake("previousExperience", e.target.value)
                    }
                />
            </Field>

            <Field label="Have you had yoga therapy before?">
                <div className="radio-line">
                    <label>
                        <input
                            type="radio"
                            name="hadYogaTherapy"
                            value="Yes"
                            checked={intakeData.hadYogaTherapy === "Yes"}
                            onChange={(e) =>
                                updateIntake("hadYogaTherapy", e.target.value)
                            }
                        />
                        Yes
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="hadYogaTherapy"
                            value="No"
                            checked={intakeData.hadYogaTherapy === "No"}
                            onChange={(e) =>
                                updateIntake("hadYogaTherapy", e.target.value)
                            }
                        />
                        No
                    </label>
                </div>
            </Field>

            {intakeData.hadYogaTherapy === "Yes" && (
                <>
                    <Field label="Date of last yoga therapy session">
                        <input
                            type="date"
                            value={intakeData.lastYogaTherapySession}
                            onChange={(e) =>
                                updateIntake(
                                    "lastYogaTherapySession",
                                    e.target.value
                                )
                            }
                        />
                    </Field>

                    <Field label="How often?">
                        <select
                            value={intakeData.yogaTherapyFrequency}
                            onChange={(e) =>
                                updateIntake(
                                    "yogaTherapyFrequency",
                                    e.target.value
                                )
                            }
                        >
                            <option value="">Select frequency</option>
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                        </select>
                    </Field>
                </>
            )}

            {/* YOGA STYLES */}

            <h2>Yoga styles</h2>

            <Field label="Styles of yoga practised (select all that apply)">
                <div className="checkbox-grid">
                    {yogaStyles.map((style) => (
                        <label key={style}>
                            <input
                                type="checkbox"
                                checked={intakeData.yogaStyles.includes(style)}
                                onChange={() =>
                                    toggleArrayValue("yogaStyles", style)
                                }
                            />
                            {style}
                        </label>
                    ))}
                </div>
            </Field>

            <Field label="Other yoga style">
                <input
                    value={intakeData.otherYogaStyle}
                    onChange={(e) =>
                        updateIntake("otherYogaStyle", e.target.value)
                    }
                />
            </Field>

            {/* GOALS */}

            <h2>Goals &amp; expectations</h2>

            <Field label="What benefits are you looking for?">
                <div className="checkbox-grid">
                    {yogaGoals.map((goal) => (
                        <label key={goal}>
                            <input
                                type="checkbox"
                                checked={intakeData.goals.includes(goal)}
                                onChange={() =>
                                    toggleArrayValue("goals", goal)
                                }
                            />
                            {goal}
                        </label>
                    ))}
                </div>
            </Field>

            <Field label="Other goals / expectations">
                <textarea
                    value={intakeData.otherGoals}
                    onChange={(e) =>
                        updateIntake("otherGoals", e.target.value)
                    }
                />
            </Field>

            {/* PERSONAL INTERESTS */}

            <h2>Personal yoga interests</h2>

            <Field label="Select all that apply">
                <div className="checkbox-grid">
                    {yogaInterests.map((interest) => (
                        <label key={interest}>
                            <input
                                type="checkbox"
                                checked={intakeData.yogaInterests.includes(
                                    interest
                                )}
                                onChange={() =>
                                    toggleArrayValue(
                                        "yogaInterests",
                                        interest
                                    )
                                }
                            />
                            {interest}
                        </label>
                    ))}
                </div>
            </Field>

            <Field label="Other yoga interests">
                <input
                    value={intakeData.otherYogaInterest}
                    onChange={(e) =>
                        updateIntake("otherYogaInterest", e.target.value)
                    }
                />
            </Field>

            {/* LIFESTYLE */}

            <h2>Lifestyle &amp; fitness</h2>

            <Field label="Current activity level">
                <select
                    value={intakeData.activityLevel}
                    onChange={(e) =>
                        updateIntake("activityLevel", e.target.value)
                    }
                >
                    <option value="Sedentary / Very inactive">
                        Sedentary / Very inactive
                    </option>

                    <option value="Somewhat inactive">
                        Somewhat inactive
                    </option>

                    <option value="Average">
                        Average
                    </option>

                    <option value="Somewhat active">
                        Somewhat active
                    </option>

                    <option value="Extremely active">
                        Extremely active
                    </option>
                </select>
            </Field>

            <Field label={`Stress level: ${intakeData.stressLevel} / 10`}>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={intakeData.stressLevel}
                    onChange={(e) =>
                        updateIntake("stressLevel", e.target.value)
                    }
                />
            </Field>

            {/* HEALTH */}

            <h2>Health &amp; safety information</h2>

            <Field label="Do you have any current injuries or physical limitations? *">
                <div className="radio-line">
                    <label>
                        <input
                            type="radio"
                            name="injury"
                            value="Yes"
                            checked={intakeData.hasInjury === "Yes"}
                            onChange={(e) =>
                                updateIntake("hasInjury", e.target.value)
                            }
                        />
                        Yes
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="injury"
                            value="No"
                            checked={intakeData.hasInjury === "No"}
                            onChange={(e) =>
                                updateIntake("hasInjury", e.target.value)
                            }
                        />
                        No
                    </label>
                </div>
            </Field>

            {intakeData.hasInjury === "Yes" && (
                <Field label="Please provide injury details">
                    <textarea
                        value={intakeData.injuryDetails}
                        onChange={(e) =>
                            updateIntake("injuryDetails", e.target.value)
                        }
                    />
                </Field>
            )}

            {/* PHYSICAL HISTORY */}

            <h2>Physical history</h2>

            <p>
                Please select any conditions that have affected your health
                recently or in the past.
            </p>

            <Field label="Health conditions">
                <div className="checkbox-grid">
                    {healthConditions.map((condition) => (
                        <label key={condition}>
                            <input
                                type="checkbox"
                                checked={intakeData.healthConditions.includes(
                                    condition
                                )}
                                onChange={() =>
                                    toggleArrayValue(
                                        "healthConditions",
                                        condition
                                    )
                                }
                            />
                            {condition}
                        </label>
                    ))}
                </div>
            </Field>

            <Field label="Other condition / explanation">
                <textarea
                    value={intakeData.otherHealthCondition}
                    onChange={(e) =>
                        updateIntake(
                            "otherHealthCondition",
                            e.target.value
                        )
                    }
                />
            </Field>

            {/* MEDICATION */}

            <h2>Medication</h2>

            <Field label="Are you currently taking any medications?">
                <div className="radio-line">
                    <label>
                        <input
                            type="radio"
                            name="medication"
                            value="Yes"
                            checked={intakeData.takingMedication === "Yes"}
                            onChange={(e) =>
                                updateIntake(
                                    "takingMedication",
                                    e.target.value
                                )
                            }
                        />
                        Yes
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="medication"
                            value="No"
                            checked={intakeData.takingMedication === "No"}
                            onChange={(e) =>
                                updateIntake(
                                    "takingMedication",
                                    e.target.value
                                )
                            }
                        />
                        No
                    </label>
                </div>
            </Field>

            {intakeData.takingMedication === "Yes" && (
                <Field label="Please list medication names and reasons">
                    <textarea
                        value={intakeData.medicationDetails}
                        onChange={(e) =>
                            updateIntake(
                                "medicationDetails",
                                e.target.value
                            )
                        }
                    />
                </Field>
            )}

            {/* ADDITIONAL INFORMATION */}

            <h2>Additional information</h2>

            <Field label="Accessibility requirements (optional)">
                <textarea
                    value={intakeData.accessibilityRequirements}
                    onChange={(e) =>
                        updateIntake(
                            "accessibilityRequirements",
                            e.target.value
                        )
                    }
                />
            </Field>

            <Field label="Are you currently under medical care? (optional)">
                <textarea
                    value={intakeData.medicalCare}
                    onChange={(e) =>
                        updateIntake("medicalCare", e.target.value)
                    }
                />
            </Field>

            <Field label="Is there anything else the practitioner should know? (optional)">
                <textarea
                    value={intakeData.additionalInformation}
                    onChange={(e) =>
                        updateIntake(
                            "additionalInformation",
                            e.target.value
                        )
                    }
                />
            </Field>

            <InfoBox title="Your information">
                The information you provide will only be accessible to
                authorised staff and stored securely.
            </InfoBox>
        </Reg>
    );
}
import { useState } from "react";

import {
    RegistrationLayout as Reg,
    Field,
    InfoBox,
} from "../components/RegistrationLayout";

export default function Intake({ go, Header, currentClient }) {
    const [intakeData, setIntakeData] = useState({
        experienceLevel: "Beginner",
        yearsOfPractice: "",
        previousExperience: "",
        goals: "",
        hasInjury: "No",
        injuryDetails: "",
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

            <Field label="Goals / reasons for practising yoga">
                <textarea
                    value={intakeData.goals}
                    onChange={(e) =>
                        updateIntake("goals", e.target.value)
                    }
                />
            </Field>

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

            <Field label="If yes, please provide details">
                <textarea
                    value={intakeData.injuryDetails}
                    onChange={(e) =>
                        updateIntake("injuryDetails", e.target.value)
                    }
                />
            </Field>

            <Field label="Accessibility requirements (optional)">
                <textarea
                    value={intakeData.accessibilityRequirements}
                    onChange={(e) =>
                        updateIntake("accessibilityRequirements", e.target.value)
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
                    value={intakeData.additionalInfo}
                    onChange={(e) =>
                        updateIntake("additionalInfo", e.target.value)
                    }
                />
            </Field>

            <InfoBox title="Your information">
                The information you provide will only be accessible to authorised staff
                and stored securely.
            </InfoBox>
        </Reg>
    );
}
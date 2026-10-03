
import {
  Field,
  InfoBox,
  RegistrationLayout,
} from "../components/RegistrationLayout";

export default function AddClient({
  go,
  Header,
  form,
  setForm,
  setCurrentClient,
}) {
  const handleContinue = async () => {
    try {
      if (!form.firstName || !form.lastName || !form.email) {
        alert("Please enter first name, last name and email.");
        return;
      }

      const response = await fetch("http://localhost:3001/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to create client.");
        return;
      }

      console.log("Client created:", data);

      setCurrentClient(data);

      go("intake");
    } catch (error) {
      console.error("Failed to create client:", error);
      alert("Could not connect to the server.");
    }
  };
  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <RegistrationLayout
      title="Add New Client"
      subtitle="Create a client record and complete registration details."
      step={1}
      back={() => go("clients")}
      next={handleContinue}
      nextLabel="Continue to intake"
      Header={Header}
    >
      <h2>Personal information</h2>

      <div className="two-cols">
        <Field label="First name *">
          <input
            placeholder="e.g. Mia"
            value={form.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
          />
        </Field>

        <Field label="Last name *">
          <input
            placeholder="e.g. Chen"
            value={form.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Email address *">
        <input
          type="email"
          placeholder="e.g. mia.chen@email.com"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
        />
      </Field>

      <div className="two-cols">
        <Field label="Phone number">
          <input
            placeholder="e.g. 0412 345 678"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />
        </Field>

        <Field label="Date of birth">
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => updateField("dateOfBirth", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Gender (optional)">
        <select
          value={form.gender}
          onChange={(e) => updateField("gender", e.target.value)}
        >
          <option value="">Select</option>
          <option>Female</option>
          <option>Male</option>
          <option>Non-binary</option>
          <option>Prefer not to say</option>
        </select>
      </Field>

      <h2>Emergency contact</h2>

      <div className="three-cols">
        <Field label="Contact name">
          <input
            placeholder="e.g. Li Chen"
            value={form.emergencyName}
            onChange={(e) => updateField("emergencyName", e.target.value)}
          />
        </Field>

        <Field label="Relationship">
          <input
            placeholder="e.g. Parent"
            value={form.emergencyRelationship}
            onChange={(e) => updateField("emergencyRelationship", e.target.value)}
          />
        </Field>

        <Field label="Phone number">
          <input
            placeholder="e.g. 0412 345 678"
            value={form.emergencyPhone}
            onChange={(e) => updateField("emergencyPhone", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Additional information (optional)">
        <textarea
          value={form.additionalInfo}
          onChange={(e) => updateField("additionalInfo", e.target.value)}
        />
      </Field>

      <InfoBox title="Privacy and security">
        Client information is stored securely and only accessible to authorised
        users.
      </InfoBox>
    </RegistrationLayout>
  );
}

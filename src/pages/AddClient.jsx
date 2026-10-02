import {
  Field,
  InfoBox,
  RegistrationLayout,
} from "../components/RegistrationLayout";

export default function AddClient({ go, Header }) {
  return (
    <RegistrationLayout
      title="Add New Client"
      subtitle="Create a client record and complete registration details."
      step={1}
      back={() => go("clients")}
      next={() => go("intake")}
      nextLabel="Continue to intake"
      Header={Header}
    >
      <h2>Personal information</h2>

      <div className="two-cols">
        <Field label="First name *">
          <input placeholder="e.g. Mia" />
        </Field>

        <Field label="Last name *">
          <input placeholder="e.g. Chen" />
        </Field>
      </div>

      <Field label="Email address *">
        <input type="email" placeholder="e.g. mia.chen@email.com" />
      </Field>

      <div className="two-cols">
        <Field label="Phone number">
          <input placeholder="e.g. 0412 345 678" />
        </Field>

        <Field label="Date of birth">
          <input placeholder="DD / MM / YYYY" />
        </Field>
      </div>

      <Field label="Gender (optional)">
        <select defaultValue="">
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
          <input placeholder="e.g. Li Chen" />
        </Field>

        <Field label="Relationship">
          <input placeholder="e.g. Parent" />
        </Field>

        <Field label="Phone number">
          <input placeholder="e.g. 0412 345 678" />
        </Field>
      </div>

      <Field label="Additional information (optional)">
        <textarea />
      </Field>

      <InfoBox title="Privacy and security">
        Client information is stored securely and only accessible to authorised
        users.
      </InfoBox>
    </RegistrationLayout>
  );
}

import { useState } from "react";
import { Search } from "lucide-react";
import { initialClients } from "../data/clients";

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function Clients({ go, Page }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = initialClients.filter((client) => {
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();

    const email = client.email.toLowerCase();
    const search = searchTerm.toLowerCase().trim();

    return fullName.includes(search) || email.includes(search);
  });

  return (
    <Page
      title="Clients"
      subtitle="View profiles, memberships and client activity."
      action="Add new client"
      onAction={() => go("add-client")}
    >
      <div className="stat-grid">
        <Stat label="Total clients" value={initialClients.length} />

        <Stat label="Active this month" value="92" />

        <Stat label="New this week" value="6" />
      </div>

      <section className="panel client-panel">
        <div className="panel-heading">
          <h2>Client list</h2>

          <label className="search-box">
            <Search size={16} />

            <input
              placeholder="Search clients…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>

        <div className="table-row table-head">
          <span>Name</span>
          <span>Email</span>
          <span>Membership</span>
          <span>Last activity</span>
        </div>

        {filteredClients.map((client) => (
          <button
            className="table-row"
            key={client.id}
            onClick={() => go("client-profile")}
          >
            <span>
              {client.firstName} {client.lastName}
            </span>

            <span>{client.email}</span>
            <span>{client.membership}</span>
            <span>{client.lastActivity}</span>
          </button>
        ))}

        {filteredClients.length === 0 && (
          <div className="empty-state">
            <Search />
            <strong>No clients found</strong>
            <span>Try searching by client name or email.</span>
          </div>
        )}
      </section>
    </Page>
  );
}

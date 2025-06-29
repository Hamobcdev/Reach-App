// src/pages/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";

function AdminDashboard() {
  const [disputes, setDisputes] = useState([]);
  const [agents, setAgents] = useState([]);
  const [vault, setVault] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const [
        { data: disputesData },
        { data: agentsData },
        { data: vaultData },
      ] = await Promise.all([
        supabase.from("disputes").select("*"),
        supabase.from("agents").select("*"),
        supabase.from("vault").select("*").single(),
      ]);
      setDisputes(disputesData);
      setAgents(agentsData);
      setVault(vaultData);
    };
    fetchData();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>
      <Tabs defaultValue="disputes" className="mt-4">
        <TabsList className="flex space-x-4 border-b">
          <TabsTrigger value="disputes" className="px-4 py-2">
            Dispute Resolution
          </TabsTrigger>
          <TabsTrigger value="agents" className="px-4 py-2">
            Agent Portal
          </TabsTrigger>
          <TabsTrigger value="vault" className="px-4 py-2">
            Vault Management
          </TabsTrigger>
        </TabsList>
        <TabsContent value="disputes">
          <ul>
            {disputes.map((dispute) => (
              <li key={dispute.id}>
                {dispute.status} - {dispute.details.reason}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="agents">
          <ul>
            {agents.map((agent) => (
              <li key={agent.id}>
                {agent.status} - {agent.user_id}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="vault">
          <p>Balance: {vault?.balance}</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default AdminDashboard;

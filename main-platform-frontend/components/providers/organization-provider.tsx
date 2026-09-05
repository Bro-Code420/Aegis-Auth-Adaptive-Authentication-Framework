"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

interface OrganizationContextType {
  activeOrganization: Id<"organizations"> | null;
  setActiveOrganization: (id: Id<"organizations">) => void;
  organizations: any[] | undefined;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const organizations = useQuery(api.organizations.getUserOrganizations)
  const [activeOrganization, setActiveOrganization] = useState<Id<"organizations"> | null>(null)

  useEffect(() => {
    // Attempt to select the first active organization if none selected yet
    if (organizations && organizations.length > 0 && !activeOrganization) {
      setActiveOrganization(organizations[0]._id as Id<"organizations">)
    }
  }, [organizations, activeOrganization])

  return (
    <OrganizationContext.Provider value={{ activeOrganization, setActiveOrganization, organizations }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider")
  }
  return context
}

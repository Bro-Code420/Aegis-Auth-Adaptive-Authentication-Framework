"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useQuery, useMutation } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

interface OrganizationContextType {
  activeOrganization: Id<"organizations"> | null;
  setActiveOrganization: (id: Id<"organizations">) => void;
  organizations: any[] | undefined;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, user } = useUser()
  const organizations = useQuery(api.organizations.getUserOrganizations)
  const ensureOrg = useMutation(api.organizations.ensureUserOrganization)
  const seedPolicies = useMutation(api.riskPolicies.seed)
  const [activeOrganization, setActiveOrganization] = useState<Id<"organizations"> | null>(null)

  useEffect(() => {
    // If user is logged in and has 0 organizations, auto-provision default workspace & policies
    if (isSignedIn && organizations !== undefined && organizations.length === 0) {
      const defaultName = user?.fullName ? `${user.fullName}'s Workspace` : "Primary Workspace"
      ensureOrg({ defaultName })
        .then((orgId) => {
          if (orgId && !activeOrganization) {
            setActiveOrganization(orgId as Id<"organizations">)
          }
        })
        .catch(() => {})
      seedPolicies({}).catch(() => {})
    }
  }, [isSignedIn, organizations, user, ensureOrg, seedPolicies, activeOrganization])

  useEffect(() => {
    // Select first active organization if none selected yet
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

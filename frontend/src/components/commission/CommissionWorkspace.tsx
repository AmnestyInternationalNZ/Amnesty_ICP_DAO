import React,{useMemo} from "react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {InternetIdentityOverride,type InternetIdentityContext} from "../../hooks/useInternetIdentity";
import CommunityWorkspacePage from "../CommunityWorkspacePage";
export default function CommissionWorkspace({auth,groupId,kind}:{auth:InternetIdentityContext;groupId:bigint;kind:"documents"|"boards"|"calendar"}){
 const principal=auth.identity?.getPrincipal().toText()||"anonymous";
 // Legacy workspace hooks have their own cache, scoped to the current account and group.
 const client=useMemo(()=>new QueryClient(),[principal,String(groupId)]);
 const document=new URLSearchParams(location.search).get("document");
 return <InternetIdentityOverride value={auth}><QueryClientProvider client={client}><CommunityWorkspacePage communityId={groupId} kind={kind} initialDocumentId={document&&/^\d+$/.test(document)?BigInt(document):undefined}/></QueryClientProvider></InternetIdentityOverride>;
}

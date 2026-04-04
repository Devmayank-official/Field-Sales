import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { visitRepo } from "@/services/repositories/visitRepository";

export function useAllVisits() {
  return useQuery({
    queryKey: ["visits"],
    queryFn: visitRepo.getAll,
  });
}

export function useClientVisits(clientId: string) {
  return useQuery({
    queryKey: ["visits", "client", clientId],
    queryFn: () => visitRepo.getByClientId(clientId),
    enabled: !!clientId,
  });
}

export function useActiveVisits() {
  return useQuery({
    queryKey: ["visits", "active"],
    queryFn: visitRepo.getActiveVisits,
    refetchInterval: 5000,
  });
}

export function useStartVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, lat, lng }: { clientId: string; lat?: number; lng?: number }) =>
      visitRepo.startVisit(clientId, lat, lng),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["visits", "active"] });
      queryClient.invalidateQueries({ queryKey: ["visits", "client", data.clientId] });
    },
  });
}

export function useEndVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      notes,
      followUpOutcome,
      locationNote,
      fridgesChecked,
    }: {
      id: string;
      notes?: string;
      followUpOutcome?: string;
      locationNote?: string;
      fridgesChecked?: string[];
    }) => visitRepo.endVisit(id, notes, followUpOutcome, locationNote, fridgesChecked),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["visits"] });
        queryClient.invalidateQueries({ queryKey: ["visits", "active"] });
        queryClient.invalidateQueries({ queryKey: ["visits", "client", data.clientId] });
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        queryClient.invalidateQueries({ queryKey: ["fridges"] });
      }
    },
  });
}

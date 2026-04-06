import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientRepo } from "../services/repositories/clientRepository";
import type { InsertClient } from "@/lib/schema";

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: clientRepo.getAll,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => clientRepo.getById(id),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertClient) => clientRepo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertClient> }) => clientRepo.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.id] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientRepo.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.removeQueries({ queryKey: ['clients', id] });
      queryClient.invalidateQueries({ queryKey: ['fridges'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fridgeRepo } from "../services/repositories/fridgeRepository";
import type { InsertFridge } from "@/lib/schema";

export function useAllFridges() {
  return useQuery({
    queryKey: ['fridges'],
    queryFn: fridgeRepo.getAll,
  });
}

export function useClientFridges(clientId: string) {
  return useQuery({
    queryKey: ['fridges', 'client', clientId],
    queryFn: () => fridgeRepo.getByClientId(clientId),
    enabled: !!clientId,
  });
}

export function useFridge(id: string) {
  return useQuery({
    queryKey: ['fridges', id],
    queryFn: () => fridgeRepo.getById(id),
    enabled: !!id,
  });
}

export function useCreateFridge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertFridge) => fridgeRepo.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fridges'] });
      queryClient.invalidateQueries({ queryKey: ['fridges', 'client', data.clientId] });
    },
  });
}

export function useUpdateFridge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertFridge> }) => fridgeRepo.update(id, data),
    onSuccess: (data, variables) => {
      if(data) {
        queryClient.invalidateQueries({ queryKey: ['fridges'] });
        queryClient.invalidateQueries({ queryKey: ['fridges', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['fridges', 'client', data.clientId] });
      }
    },
  });
}

export function useDeleteFridge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      await fridgeRepo.delete(id);
      return clientId;
    },
    onSuccess: (clientId, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['fridges'] });
      queryClient.removeQueries({ queryKey: ['fridges', id] });
      if (clientId) {
         queryClient.invalidateQueries({ queryKey: ['fridges', 'client', clientId] });
      }
    },
  });
}

export function useTransferFridge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newClientId }: { id: string; newClientId: string }) =>
      fridgeRepo.transfer(id, newClientId),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['fridges'] });
      queryClient.invalidateQueries({ queryKey: ['fridges', id] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['fridges', 'client', data.clientId] });
      }
    },
  });
}

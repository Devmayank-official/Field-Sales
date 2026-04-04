import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { imageRepo } from "@/services/repositories/imageRepository";
import type { AppImage } from "@/lib/schema";

export function useEntityImages(entityType: AppImage["entityType"], entityId: string) {
  return useQuery({
    queryKey: ["images", entityType, entityId],
    queryFn: () => imageRepo.getByEntity(entityType, entityId),
    enabled: !!entityId,
  });
}

export function useAddImage(entityType: AppImage["entityType"], entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, caption }: { file: File; caption?: string }) =>
      imageRepo.add(entityType, entityId, file, caption),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["images", entityType, entityId] });
    },
  });
}

export function useDeleteImage(entityType: AppImage["entityType"], entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => imageRepo.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["images", entityType, entityId] });
    },
  });
}

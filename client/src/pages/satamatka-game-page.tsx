import { useParams } from "wouter";
import { ProtectedRoute } from "@/lib/protected-route";
import SatamatkaGame from "@/components/satamatka-game";

export default function SatamatkaGamePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <ProtectedRoute>
      <SatamatkaGame />
    </ProtectedRoute>
  );
}
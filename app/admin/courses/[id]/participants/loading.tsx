import { Card, CardContent, LoadingState } from "@/components/ui";

export default function CourseParticipantsLoading() {
  return <Card><CardContent><LoadingState label="Cargando participantes del curso" /></CardContent></Card>;
}

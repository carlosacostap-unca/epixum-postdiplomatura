import type { Link as LinkType } from "@/types";
import { ResourceReader } from "@/components/course/ResourceReader";

export default function StudentResourceList({ links }: { links: LinkType[] }) {
  return <ResourceReader links={links} emptyDescription="El docente todavía no publicó materiales para esta clase." />;
}

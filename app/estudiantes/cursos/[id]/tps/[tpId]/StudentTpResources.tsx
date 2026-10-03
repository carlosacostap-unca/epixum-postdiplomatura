import type { Link as LinkType } from "@/types";
import { ResourceReader } from "@/components/course/ResourceReader";

export default function StudentTpResources({ links }: { links: LinkType[] }) {
  return <ResourceReader links={links} heading="Recursos del trabajo" showHeading={false} emptyDescription="El enunciado no tiene material adicional." />;
}

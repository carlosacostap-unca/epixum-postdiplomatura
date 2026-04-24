export interface BaseModel {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

export type UserRole = 'admin' | 'docente' | 'estudiante';

export interface User extends BaseModel {
  username: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  dni?: string;
  birthDate?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
}

export interface Link extends BaseModel {
  title: string;
  url: string;
  type?: 'link' | 'file';
  class?: string; // Relation to Class ID (optional, mutually exclusive with assignment)
  assignment?: string; // Relation to Assignment ID (optional, mutually exclusive with class)
}

export interface Class extends BaseModel {
  title: string;
  description: string;
  date: string;
  course?: string; // Relation to Course ID
  // Expanding relations
  expand?: {
    links?: Link[];
    course?: Course;
  };
}

export interface Assignment extends BaseModel {
  title: string;
  description: string;
  dueDate?: string; // Adding dueDate as it might be useful without sprints
  systemPrompt?: string; // Prompt de sistema para preevaluación con IA
  course?: string; // Relation to Course ID
  // Expanding relations
  expand?: {
    links?: Link[];
    deliveries?: Delivery[];
    course?: Course;
  };
}

export interface DeliveryFile {
  name: string;
  url: string;
}

export interface Delivery extends BaseModel {
  assignment: string;
  student: string;
  repositoryUrl: string; // JSON array string of DeliveryFile[] or legacy single URL
  grade?: number;
  feedback?: string;
  verdict?: 'Aprobado' | 'Corregir y reenviar';
  status?: 'pending' | 'draft' | 'published';
  expand?: {
    student?: User;
  };
}

// Helper to parse delivery files from repositoryUrl field
export function parseDeliveryFiles(repositoryUrl: string): DeliveryFile[] {
  if (!repositoryUrl) return [];
  try {
    if (repositoryUrl.trimStart().startsWith('[')) {
      return JSON.parse(repositoryUrl) as DeliveryFile[];
    }
    // Legacy: single URL – extract filename from URL
    const name = decodeURIComponent(repositoryUrl.split('/').pop() || 'archivo.zip');
    return [{ name, url: repositoryUrl }];
  } catch {
    return [];
  }
}

export interface Course extends BaseModel {
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  status: 'borrador' | 'en curso' | 'finalizado';
  students?: string[]; // Relation to multiple User IDs
  teachers?: string[]; // Relation to multiple User IDs
  classes?: string[]; // Relation to multiple Class IDs
  assignments?: string[]; // Relation to multiple Assignment IDs
  inquiries?: string[]; // Relation to multiple Inquiry IDs
  expand?: {
    students?: User[];
    teachers?: User[];
    classes?: Class[];
    assignments?: Assignment[];
    inquiries?: Inquiry[];
  };
}

export interface Inquiry extends BaseModel {
  title: string;
  description: string;
  status: 'Pendiente' | 'Resuelta';
  author: string; // Relation to User ID
  course?: string; // Relation to Course ID
  class?: string; // Relation to Class ID (optional)
  assignment?: string; // Relation to Assignment ID (optional)
  expand?: {
    author?: User;
    course?: Course;
    class?: Class;
    assignment?: Assignment;
  };
}

export interface InquiryResponse extends BaseModel {
  inquiry: string; // Relation to Inquiry ID
  author: string; // Relation to User ID
  content: string;
  expand?: {
    author?: User;
  };
}

export interface EnrollmentRequest extends BaseModel {
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string;
  email: string;
  phone: string;
  courses: string[]; // Relation to multiple Course IDs
  status: 'pending' | 'approved' | 'rejected';
  expand?: {
    courses?: Course[];
  };
}


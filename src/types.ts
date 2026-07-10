export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface Job {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedDate: string;  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  jobUrl?: string;
}

export interface CreateJobInput {
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedDate: string;
  notes?: string;
  jobUrl?: string;
}

// Partial<T> makes every field optional — perfect for PATCH
export type UpdateJobInput = Partial<CreateJobInput>;
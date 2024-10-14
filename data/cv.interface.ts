export interface Language {
  name: string;
  level: string;
}

export interface Structure {
  title: string;
  structure: string;
  location?: string;
  from: string;
  to: string;
  tasks: string[];
  tasksExtended?: string[];
  skills?: string[];
}

export interface Cv {
  theme: 'lux-sleek' | 'simple-hipster';
  variant: string;
  language: string;
  firstName: string;
  lastName: string;
  title: string;
  abstract: string;
  image: string;
  email: string;
  pec?: string;
  phone: string;
  location: string;
  links: {
    linkedin?: string;
    github?: string;
  };
  skills: string[];
  certifications: string[];
  hobbies: string[];
  languages: Language[];
  works: Structure[];
  educations: Structure[];
}

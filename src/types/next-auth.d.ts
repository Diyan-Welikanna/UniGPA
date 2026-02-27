import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      degreeId?: number | null;
      role?: string;
    };
  }

  interface User {
    id: string;
    degreeId?: number | null;
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    degreeId?: number | null;
    role?: string;
  }
}

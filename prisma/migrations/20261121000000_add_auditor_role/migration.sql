-- AlterEnum: role ketiga (AUDITOR = akses baca saja pada panel Admin)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AUDITOR';

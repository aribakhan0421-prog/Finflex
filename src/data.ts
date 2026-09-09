/**
 * @file src/data.ts
 * @description Master catalog of seeded financial consultants, accountants, and initial mock records.
 * Provides baseline directory data for initial app bootstrapping before local storage persistence.
 * 
 * Target Roles: Used across Customer discovery, Provider onboarding seed, and Admin monitoring.
 * Depended on by: types/index.ts, services/dataService.ts, App.tsx.
 */

import { Star, ShieldCheck } from 'lucide-react';

/**
 * Service offering item with title and standard consultation pricing.
 */
export interface Service {
  name: string;
  price: string;
}

/**
 * Verified customer review with rating score and testimonial feedback.
 */
export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

/**
 * Freelancer / Financial Professional profile schema for marketplace browsing.
 */
export interface Freelancer {
  id: string;
  name: string;
  title: string;
  specialization: string;
  category: string;
  distance: number;
  rating: number;
  reviewsCount: number;
  experience: number;
  license: string;
  bio: string;
  price: number;
  image: string;
  services: Service[];
  reviews: Review[];
}

/**
 * Pre-seeded list of diverse financial and tax specialists in the Mumbai region.
 * Synchronized with dataService to generate default UserAccount and ProviderProfile instances.
 */
export const FREELANCERS: Freelancer[] = [

  {
    id: '1',
    name: 'Amit Sharma',
    title: 'Chartered Accountant',
    specialization: 'Tax Filing & Audit',
    category: 'Tax Filing',
    distance: 1.2,
    rating: 4.9,
    reviewsCount: 124,
    experience: 8,
    license: 'ICAI-2015-8821',
    bio: 'Specializing in corporate taxation and individual ITR filings with over 8 years of experience in Mumbai.',
    price: 1500,
    image: 'https://picsum.photos/seed/amit/200/200',
    services: [
      { name: 'Individual ITR Filing', price: '₹1,500' },
      { name: 'Corporate Tax Audit', price: '₹15,000' },
      { name: 'GST Consultation', price: '₹2,000' }
    ],
    reviews: [
      { id: 'r1', userName: 'Rahul V.', rating: 5, comment: 'Very professional and knowledgeable. Helped me save a lot on taxes.', date: '2 days ago' },
      { id: 'r2', userName: 'Sneha M.', rating: 4, comment: 'Quick response and clear explanation of the process.', date: '1 week ago' }
    ]
  },
  {
    id: '2',
    name: 'Priya Iyer',
    title: 'Tax Consultant',
    specialization: 'GST Registration',
    category: 'GST Reg',
    distance: 3.5,
    rating: 4.8,
    reviewsCount: 89,
    experience: 5,
    license: 'GSTN-MUM-4421',
    bio: 'Expert in GST compliance and business registrations for startups and SMEs in the Maharashtra region.',
    price: 1200,
    image: 'https://picsum.photos/seed/priya/200/200',
    services: [
      { name: 'GST Registration', price: '₹1,200' },
      { name: 'Monthly GST Filing', price: '₹2,500' },
      { name: 'Business Setup Advisory', price: '₹5,000' }
    ],
    reviews: [
      { id: 'r3', userName: 'Karan J.', rating: 5, comment: 'Priya made GST registration look so easy. Highly recommended!', date: '3 days ago' }
    ]
  },
  {
    id: '3',
    name: 'Rajesh Malhotra',
    title: 'Financial Planner',
    specialization: 'Investment Plans',
    category: 'Investment',
    distance: 0.8,
    rating: 4.7,
    reviewsCount: 210,
    experience: 12,
    license: 'SEBI-RIA-2012',
    bio: 'Helping families achieve financial freedom through disciplined investment planning and wealth management.',
    price: 2500,
    image: 'https://picsum.photos/seed/rajesh/200/200',
    services: [
      { name: 'Comprehensive Financial Plan', price: '₹5,000' },
      { name: 'Mutual Fund Advisory', price: '₹2,500' },
      { name: 'Retirement Planning', price: '₹4,000' }
    ],
    reviews: [
      { id: 'r4', userName: 'Anjali S.', rating: 5, comment: 'Great insights into wealth management. My portfolio is doing much better now.', date: '5 days ago' }
    ]
  },
  {
    id: '4',
    name: 'Sneha Kulkarni',
    title: 'Insurance Specialist',
    specialization: 'Insurance',
    category: 'Insurance',
    distance: 2.1,
    rating: 4.6,
    reviewsCount: 56,
    experience: 4,
    license: 'IRDAI-99281',
    bio: 'Dedicated to finding the best health and life insurance coverage tailored to your family needs.',
    price: 800,
    image: 'https://picsum.photos/seed/sneha/200/200',
    services: [
      { name: 'Health Insurance Audit', price: '₹800' },
      { name: 'Term Life Consultation', price: '₹1,200' },
      { name: 'Claims Assistance', price: '₹2,000' }
    ],
    reviews: [
      { id: 'r5', userName: 'Vikram P.', rating: 4, comment: 'Helpful advice on choosing the right term plan.', date: '2 weeks ago' }
    ]
  },
  {
    id: '5',
    name: 'Vikram Singh',
    title: 'Corporate Lawyer & CA',
    specialization: 'Tax & Corporate Legal',
    category: 'Legal',
    distance: 4.2,
    rating: 4.9,
    reviewsCount: 167,
    experience: 15,
    license: 'ICAI-2009-1122',
    bio: 'Senior consultant for complex tax litigation and high-net-worth individual wealth structuring.',
    price: 5000,
    image: 'https://picsum.photos/seed/vikram/200/200',
    services: [
      { name: 'Tax Litigation Support', price: '₹10,000' },
      { name: 'Estate Planning', price: '₹15,000' },
      { name: 'International Tax Advisory', price: '₹20,000' }
    ],
    reviews: [
      { id: 'r6', userName: 'Sanjay K.', rating: 5, comment: 'Exceptional legal and financial advice for my business expansion.', date: '1 month ago' }
    ]
  }
];

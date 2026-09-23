import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ClubPointsProvider } from './context/ClubPointsContext';
import { WishlistProvider } from './context/WishlistContext';
import { Layout } from './components/layout/Layout';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Pages
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoryPage } from './pages/CategoryPage';
import { AllCategoriesPage } from './pages/AllCategoriesPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { SearchPage } from './pages/SearchPage';
import { VisualSearchPage } from './pages/VisualSearchPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { ClubPage } from './pages/ClubPage';
import { AgencyPage } from './pages/AgencyPage';
import { DealerPortalPage } from './pages/DealerPortalPage';
import { DemoAgenciesAdminPage } from './pages/DemoAgenciesAdminPage';
import { AdminLayout } from './admin/AdminLayout';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ClubPointsProvider>
              <Layout>
                <Routes>
                  {/* 1. Home Page */}
                  <Route path="/" element={<HomePage />} />

                  {/* Products Catalog Page */}
                  <Route path="/products" element={<ProductsPage />} />

                  {/* All Categories Page */}
                  <Route path="/categories" element={<AllCategoriesPage />} />

                  {/* Club Page */}
                  <Route path="/club" element={<ClubPage />} />

                  {/* 2. Category Listing */}
                  <Route path="/category/:slug" element={<CategoryPage />} />

                  {/* 3. Product Details */}
                  <Route path="/product/:code" element={<ProductDetailPage />} />

                  {/* 4. Search Results */}
                  <Route path="/search" element={<SearchPage />} />

                  {/* 4.b Atlas Visual Product Search — جستجوی محصول با تصویر */}
                  <Route path="/visual-search" element={<VisualSearchPage />} />

                  {/* 5. Cart */}
                  <Route path="/cart" element={<CartPage />} />

                  {/* 6. Checkout (Protected) */}
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <CheckoutPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* 7. Account Customer Panel (Protected) */}
                  <Route
                    path="/account/*"
                    element={
                      <ProtectedRoute>
                        <AccountPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* 8. Agency, Dealer, and Admin Portals */}
                  <Route path="/agency/*" element={<AgencyPage />} />
                  <Route path="/dealer/*" element={<DealerPortalPage />} />
                  <Route path="/admin/demo-agencies" element={<DemoAgenciesAdminPage />} />
                  <Route path="/admin/*" element={<AdminLayout />} />

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ClubPointsProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { SignedOut, SignInButton, SignUpButton, SignedIn, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Login() {
  const { userId } = await auth();
  if (userId) redirect('/');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>

      {/* Logo - ajustado para mobile */}
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-white/50 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 border border-white/70 rounded"></div>
          </div>
          <div className="text-white">
            <div className="font-bold text-base sm:text-xl">EDL MINAS</div>
            <div className="text-[10px] sm:text-xs font-medium opacity-90">Sistema PDV</div>
          </div>
        </div>
      </div>

      {/* Main content card */}
      <div className="w-full max-w-md relative z-10 px-4">
        <SignedOut>
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-10">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-red-600 to-pink-500 rounded-2xl mb-3 sm:mb-4 shadow-lg">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                "PDV" EDL Minas 🤑
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Sistema de Controle de Vendas
              </p>
              
            </div>

            {/* Decorative line */}
            <div className="w-16 sm:w-20 h-1 bg-gradient-to-r from-red-600 to-pink-500 mx-auto mb-6 sm:mb-8 rounded-full"></div>

            {/* Buttons */}
            <div className="space-y-3 sm:space-y-4">
              <SignInButton mode="modal">
                <button className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-full font-semibold text-sm sm:text-base md:text-lg h-11 sm:h-12 md:h-14 px-6 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Acessar Sistema
                </button>
              </SignInButton>

              <SignUpButton mode="modal">
                <button className="w-full bg-white border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-full font-semibold text-sm sm:text-base md:text-lg h-11 sm:h-12 md:h-14 px-6 cursor-pointer transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Criar Conta de Vendedor
                </button>
              </SignUpButton>
            </div>

            {/* Features list */}
            <div className="mt-6 sm:mt-8 space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>Controle de vendas em tempo real</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>Gestão de produtos e estoque</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>Relatórios e indicadores MEJ</span>
              </div>
            </div>

            {/* Additional info */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-500 text-[10px] sm:text-xs">
                Sistema integrado ao indicador de<br />
                Engajamento com o MEJ<br />
              </p>
              <span className="text-xs font-bold">Criado por Igor-Dev 😎</span>
            </div>
          </div>

          {/* Bottom text */}
          <div className="text-center mt-4 sm:mt-6 text-white/90 text-xs sm:text-sm font-medium">
            <p>Nossa história, nossa identidade</p>
          </div>
        </SignedOut>

        {/* Signed in state */}
        <SignedIn>
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-3 sm:mb-4 shadow-lg">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Bem-vindo de volta!</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">Acesso autorizado ao PDV</p>
            <UserButton
              afterSignOutUrl="/login"
              appearance={{
                elements: {
                  avatarBox: "w-12 h-12 sm:w-16 sm:h-16"
                }
              }}
            />
            <p className="mt-3 sm:mt-4 text-gray-500 text-xs sm:text-sm">Redirecionando para o sistema...</p>
          </div>
        </SignedIn>
      </div>

      {/* Top right corner - ajustado para mobile */}
      {/* <div className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/90 text-right text-[10px] sm:text-xs md:text-sm font-medium">
        <p>NOSSA</p>
        <p>HISTÓRIA</p>
        <p>NOSSA</p>
        <p className="font-bold">IDENTIDADE</p>
      </div> */}
    </div>
  );
}
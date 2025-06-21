import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-400 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🐷</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Class Bank</h1>
            <p className="text-gray-600 text-lg">Your Classroom Banking System</p>
          </div>

          <Button 
            onClick={handleLogin}
            className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors shadow-lg hover:shadow-xl"
            size="lg"
          >
            Login to My Account 🏦
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

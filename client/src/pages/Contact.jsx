export default function Contact() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Get in Touch</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Have a project in mind or just want to say hi? We'd love to hear from you. 
            Drop us a message and we'll get back to you within 24 hours.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 bg-white rounded-3xl shadow-xl overflow-hidden">
          
          {/* Sidebar: Contact Info */}
          <div className="bg-indigo-700 p-10 text-white flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
              <div className="space-y-6">
                <ContactMethod icon="📍" label="Visit Us" detail="123 Innovation Way, Tech City" />
                <ContactMethod icon="📧" label="Email Us" detail="hello@brandname.com" />
                <ContactMethod icon="📞" label="Call Us" detail="+1 (555) 000-0000" />
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-4 mt-12">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-500 cursor-pointer transition">T</div>
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-500 cursor-pointer transition">I</div>
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-500 cursor-pointer transition">L</div>
            </div>
          </div>

          {/* Main: Contact Form */}
          <div className="md:col-span-2 p-10">
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2">First Name</label>
                <input type="text" className="border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-2 transition" placeholder="John" />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                <input type="text" className="border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-2 transition" placeholder="Doe" />
              </div>
              <div className="flex flex-col sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input type="email" className="border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-2 transition" placeholder="john@example.com" />
              </div>
              <div className="flex flex-col sm:col-span-2">
                <label className="text-sm font-semibold text-gray-700 mb-2">Message</label>
                <textarea rows="4" className="border-2 border-gray-100 rounded-lg p-3 focus:border-indigo-600 outline-none transition" placeholder="How can we help you?"></textarea>
              </div>
              <button className="sm:col-span-2 bg-indigo-700 text-white font-bold py-4 rounded-xl hover:bg-indigo-800 transition-all shadow-lg hover:shadow-indigo-200">
                Send Message
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

function ContactMethod({ icon, label, detail }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-indigo-200 text-sm">{label}</p>
        <p className="font-medium">{detail}</p>
      </div>
    </div>
  );
}
import React from 'react';

const MasterData = () => {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Master Data</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['Person Incharge', 'Targets', 'Coverage Management', 'Product Management', 'Promo'].map((item) => (
                    <div key={item} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer">
                        <h3 className="text-lg font-semibold text-gray-800">{item}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MasterData;

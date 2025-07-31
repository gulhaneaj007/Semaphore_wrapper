import React from "react";

function ProfileCard() {
  // Use a static image or import one
  return (
    <div className="profile-card">
      <img
        src="https://i.pravatar.cc/50?img=7"
        alt="User"
        className="avatar"
      />
      <div className="profile-details">
        <div className="profile-name">Jane Doe</div>
        <div className="profile-role">Product Manager</div>
      </div>
    </div>
  );
}

export default ProfileCard;
